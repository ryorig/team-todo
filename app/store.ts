"use client";

// Firestore への読み書き。書き込みは端末に即反映（オフライン時は自動で後から送信）されるので await 不要
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AppUser, List, Task } from "@/lib/types";

export type AppData = { users: AppUser[]; lists: List[]; tasks: Task[] };
export type TaskInput = {
  listId: string;
  parentId?: string | null;
  title: string;
  notes?: string;
  dueDate?: string | null;
  assigneeId?: string | null;
  starred?: boolean;
};

const uid = () => auth.currentUser?.uid ?? null;

// ---- 読み込み（リアルタイム購読） ----
export function useAppData(enabled: boolean) {
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [lists, setLists] = useState<List[] | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const onErr = (e: { code?: string }) => {
      if (e.code === "permission-denied") setDenied(true);
    };
    const opts = { includeMetadataChanges: true };
    const u1 = onSnapshot(
      collection(db, "users"),
      opts,
      (s) => setUsers(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AppUser, "id">) }))),
      onErr,
    );
    const u2 = onSnapshot(
      collection(db, "lists"),
      opts,
      (s) => {
        const ls = s.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<List, "id">) }))
          .sort((a, b) => a.sortOrder - b.sortOrder);
        setLists(ls);
        // 最初の1つを用意（サーバーの最新で空と確認できたときだけ）
        if (ls.length === 0 && !s.metadata.fromCache) createList("チームのタスク", 0);
      },
      onErr,
    );
    // 完了から30日以上たったタスクは読み込まない
    const u3 = onSnapshot(
      collection(db, "tasks"),
      opts,
      (s) => {
        const cutoff = new Date(Date.now() - 30 * 864e5).toISOString();
        setTasks(
          s.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<Task, "id">) }))
            .filter((t) => !t.done || !t.completedAt || t.completedAt > cutoff)
            .sort((a, b) => a.createdAt - b.createdAt),
        );
        setOffline(s.metadata.fromCache && typeof navigator !== "undefined" && !navigator.onLine);
      },
      onErr,
    );
    const on = () => setOffline(!navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      u1();
      u2();
      u3();
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, [enabled]);

  const data: AppData | null = users && lists && tasks ? { users, lists, tasks } : null;
  return { data, offline, denied };
}

// ---- 自分のプロフィール（メンバー一覧用） ----
export function saveProfile() {
  const u = auth.currentUser;
  if (!u) return Promise.resolve();
  return setDoc(
    doc(db, "users", u.uid),
    { name: u.displayName ?? null, email: (u.email ?? "").toLowerCase(), image: u.photoURL ?? null },
    { merge: true },
  );
}

// ---- リスト ----
export function createList(name: string, sortOrder = Date.now()) {
  const n = name.trim();
  if (!n) return;
  setDoc(doc(collection(db, "lists")), { name: n.slice(0, 60), sortOrder }).catch(console.error);
}
export function renameList(id: string, name: string) {
  const n = name.trim();
  if (n) updateDoc(doc(db, "lists", id), { name: n.slice(0, 60) }).catch(console.error);
}
export async function deleteList(id: string) {
  const ts = await getDocs(query(collection(db, "tasks"), where("listId", "==", id)));
  const b = writeBatch(db);
  ts.docs.forEach((d) => b.delete(d.ref));
  b.delete(doc(db, "lists", id));
  await b.commit();
}

// ---- タスク ----
export function createTask(input: TaskInput) {
  const title = input.title.trim();
  if (!title) return;
  const ref = doc(collection(db, "tasks"));
  const t: Omit<Task, "id"> = {
    listId: input.listId,
    parentId: input.parentId ?? null,
    title: title.slice(0, 300),
    notes: (input.notes ?? "").slice(0, 5000),
    dueDate: input.dueDate || null,
    assigneeId: input.assigneeId || null,
    starred: !!input.starred,
    done: false,
    completedAt: null,
    createdById: uid(),
    createdAt: Date.now(),
  };
  setDoc(ref, t)
    .then(() => t.assigneeId && t.assigneeId !== uid() && notifyAssigned(ref.id))
    .catch(console.error);
}

export function updateTask(id: string, patch: Partial<TaskInput>, before?: Task) {
  const set: Record<string, unknown> = {};
  if (patch.title !== undefined) set.title = patch.title.trim().slice(0, 300) || before?.title || "";
  if (patch.notes !== undefined) set.notes = patch.notes.slice(0, 5000);
  if (patch.dueDate !== undefined) set.dueDate = patch.dueDate || null;
  if (patch.assigneeId !== undefined) set.assigneeId = patch.assigneeId || null;
  if (patch.starred !== undefined) set.starred = patch.starred;
  if (patch.listId !== undefined) set.listId = patch.listId;
  const p = updateDoc(doc(db, "tasks", id), set);
  // サブタスクもリスト移動に追従
  if (patch.listId !== undefined && before && patch.listId !== before.listId) {
    getDocs(query(collection(db, "tasks"), where("parentId", "==", id))).then((s) =>
      s.docs.forEach((d) => updateDoc(d.ref, { listId: patch.listId })),
    );
  }
  const newAssignee = set.assigneeId as string | null | undefined;
  p.then(() => {
    if (newAssignee && newAssignee !== before?.assigneeId && newAssignee !== uid()) notifyAssigned(id);
  }).catch(console.error);
}

export function toggleDone(id: string, done: boolean) {
  updateDoc(doc(db, "tasks", id), { done, completedAt: done ? new Date().toISOString() : null }).catch(
    console.error,
  );
}

export function deleteTask(id: string, all: Task[]) {
  const b = writeBatch(db);
  b.delete(doc(db, "tasks", id));
  all.filter((t) => t.parentId === id).forEach((t) => b.delete(doc(db, "tasks", t.id)));
  b.commit().catch(console.error);
}

export function clearCompleted(listId: string, all: Task[]) {
  const b = writeBatch(db);
  all.filter((t) => t.listId === listId && t.done).forEach((t) => b.delete(doc(db, "tasks", t.id)));
  b.commit().catch(console.error);
}

// ---- 通知まわり（Vercel 上の API を呼ぶ） ----
export async function api(path: string, method: string, body: unknown) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(path, {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

function notifyAssigned(taskId: string) {
  api("/api/notify/assign", "POST", { taskId }).catch(() => {});
}


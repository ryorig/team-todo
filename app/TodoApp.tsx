"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AppUser, List, Task } from "@/lib/types";
import * as A from "./store";

type ClientUser = AppUser;
type ClientTask = Task;
const VIEW_KEY = "team-todo:view:v1";
type View = "today" | "starred" | string; // それ以外は listId
type Scope = "mine" | "all";

// ---------- 小さな部品 ----------
function Avatar({ u, size = 22 }: { u?: ClientUser | null; size?: number }) {
  if (!u) return null;
  const label = (u.name ?? u.email).slice(0, 1);
  return u.image ? (
    <img className="avatar" src={u.image} alt={u.name ?? u.email} width={size} height={size} referrerPolicy="no-referrer" />
  ) : (
    <span className="avatar avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.5 }}>
      {label}
    </span>
  );
}

function Check({ done, onClick }: { done: boolean; onClick: () => void }) {
  return (
    <button
      className={"check" + (done ? " is-done" : "")}
      aria-label={done ? "未完了に戻す" : "完了にする"}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <circle cx="12" cy="12" r="9.5" />
        <path d="M7.5 12.5l3 3 6-6.5" />
      </svg>
    </button>
  );
}

function Star({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      className={"star" + (on ? " is-on" : "")}
      aria-label={on ? "スターを外す" : "スターを付ける"}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
        <path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />
      </svg>
    </button>
  );
}

// ---------- 本体 ----------
export default function TodoApp({
  me,
  ready,
  onLogout,
  onDenied,
}: {
  me: ClientUser;
  ready: boolean;
  onLogout: () => void;
  onDenied: () => void;
}) {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const { data, offline, denied } = A.useAppData(ready);
  const [view, setView] = useState<View>("today");
  const [scope, setScope] = useState<Scope>("mine");
  const [editing, setEditing] = useState<ClientTask | null>(null);
  const [adding, setAdding] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    if (denied) onDenied();
  }, [denied, onDenied]);

  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(VIEW_KEY) ?? "null");
      if (v?.scope) setScope(v.scope);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify({ scope }));
    } catch {}
  }, [scope]);

  // Firestore は書き込みを端末に即反映し、裏でサーバーへ送る（オフラインでも可）
  const toggle = (t: ClientTask) => A.toggleDone(t.id, !t.done);
  const star = (t: ClientTask) => A.updateTask(t.id, { starred: !t.starred }, t);

  const users = data?.users ?? [];
  const lists = data?.lists ?? [];
  const tasks = data?.tasks ?? [];
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const listMap = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);
  const childrenOf = useMemo(() => {
    const m = new Map<string, ClientTask[]>();
    for (const t of tasks) if (t.parentId) m.set(t.parentId, [...(m.get(t.parentId) ?? []), t]);
    return m;
  }, [tasks]);

  const topLevel = tasks.filter((t) => !t.parentId);
  const inScope = (t: ClientTask) => scope === "all" || t.assigneeId === me.id || (!t.assigneeId && t.createdById === me.id);

  // ---- 「今日」ビュー（期限ではなく、未完了タスクを表示） ----
  const todayTasks = useMemo(
    () => topLevel.filter((t) => !t.done && inScope(t)),
    [topLevel, scope, me.id],
  );
  const urgentCount = todayTasks.length;

  // ---- リスト / スター ビュー ----
  const currentList: List | undefined = listMap.get(view);
  const listOpen =
    view === "starred"
      ? topLevel.filter((t) => t.starred && !t.done)
      : topLevel.filter((t) => t.listId === view && !t.done);
  const listDone =
    view === "starred"
      ? []
      : topLevel
          .filter((t) => t.listId === view && t.done)
          .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  const sortOpen = (arr: ClientTask[]) =>
    [...arr];

  const defaultListId = currentList?.id ?? lists[0]?.id ?? "";

  // ---------- 描画 ----------
  const Row = ({ t, showList }: { t: ClientTask; showList?: boolean }) => {
    const subs = childrenOf.get(t.id) ?? [];
    const subsOpen = subs.filter((s) => !s.done);
    const assignee = t.assigneeId ? userMap.get(t.assigneeId) : null;
    return (
      <li className={"task" + (t.done ? " is-done" : "")}>
        <div className="task-main" onClick={() => setEditing(t)} role="button" tabIndex={0}>
          <Check done={t.done} onClick={() => toggle(t)} />
          <div className="task-body">
            <div className="task-title">{t.title}</div>
            {t.notes && !t.done && <div className="task-notes">{t.notes}</div>}
            <div className="task-meta">
              {showList && listMap.get(t.listId) && <span className="meta-text">{listMap.get(t.listId)!.name}</span>}
              {subs.length > 0 && (
                <span className="meta-text">
                  サブタスク {subs.length - subsOpen.length}/{subs.length}
                </span>
              )}
              {assignee && (
                <span className="assignee">
                  <Avatar u={assignee} size={18} />
                  {assignee.id === me.id ? "自分" : (assignee.name ?? assignee.email).split(" ")[0]}
                </span>
              )}
            </div>
          </div>
          {!t.done && <Star on={t.starred} onClick={() => star(t)} />}
        </div>
        {!t.done && subsOpen.length > 0 && (
          <ul className="subtasks">
            {subsOpen.map((s) => (
              <li key={s.id} className="task sub">
                <div className="task-main" onClick={() => setEditing(s)} role="button" tabIndex={0}>
                  <Check done={s.done} onClick={() => toggle(s)} />
                  <div className="task-body">
                    <div className="task-title">{s.title}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="app">
      <header className="topbar">
        <h1>
          {view === "today" ? "今日やること" : view === "starred" ? "スター付き" : currentList?.name ?? "ToDo"}
        </h1>
        <button className="icon-btn" aria-label="メニュー" onClick={() => setMenuOpen(true)}>
          <Avatar u={me} size={32} />
        </button>
      </header>

      <nav className="tabs" aria-label="リスト">
        <button className={"tab" + (view === "today" ? " is-active" : "")} onClick={() => setView("today")}>
          今日{urgentCount > 0 && <span className="badge">{urgentCount}</span>}
        </button>
        <button className={"tab" + (view === "starred" ? " is-active" : "")} onClick={() => setView("starred")} aria-label="スター付き">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden className="tab-star">
            <path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />
          </svg>
        </button>
        {lists.map((l) => (
          <button key={l.id} className={"tab" + (view === l.id ? " is-active" : "")} onClick={() => setView(l.id)}>
            {l.name}
          </button>
        ))}
        <button
          className="tab tab-add"
          onClick={() => {
            const n = prompt("新しいリスト名");
            if (n?.trim()) A.createList(n);
          }}
        >
          ＋ 新しいリスト
        </button>
      </nav>

      {offline && <div className="offline">オフラインです。最後に取得した内容を表示しています。</div>}

      <main className="content">
        {!data ? (
          <div className="skeleton">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton-row" />
            ))}
          </div>
        ) : view === "today" ? (
          <>
            <div className="segmented" role="tablist">
              <button className={scope === "mine" ? "is-active" : ""} onClick={() => setScope("mine")}>
                自分の担当
              </button>
              <button className={scope === "all" ? "is-active" : ""} onClick={() => setScope("all")}>
                チーム全員
              </button>
            </div>
            {todayTasks.length === 0 ? (
              <div className="empty">
                <div className="empty-art" aria-hidden>✓</div>
                <p className="empty-title">今日やることはありません</p>
                <p className="muted">タスクを追加すると、ここに表示されます。</p>
              </div>
            ) : (
              <ul className="task-list">
                {todayTasks.map((t) => (
                  <Row key={t.id} t={t} showList />
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            {listOpen.length === 0 ? (
              <div className="empty">
                <div className="empty-art" aria-hidden>✓</div>
                <p className="empty-title">{view === "starred" ? "スター付きのタスクはありません" : "タスクはすべて完了しました"}</p>
              </div>
            ) : (
              <ul className="task-list">
                {sortOpen(listOpen).map((t) => (
                  <Row key={t.id} t={t} showList={view === "starred"} />
                ))}
              </ul>
            )}
            {listDone.length > 0 && (
              <section className="section">
                <button className="done-toggle" onClick={() => setShowDone((v) => !v)}>
                  <span className={"chev" + (showDone ? " open" : "")}>›</span> 完了（{listDone.length}件）
                </button>
                {showDone && (
                  <ul className="task-list">
                    {listDone.map((t) => (
                      <Row key={t.id} t={t} />
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </main>

      <button className="fab" aria-label="タスクを追加" onClick={() => setAdding(true)}>
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {adding && data && (
        <TaskSheet
          mode="new"
          me={me}
          users={users}
          lists={lists}
          initial={{
            listId: defaultListId,
            assigneeId: view === "today" && scope === "mine" ? me.id : null,
          }}
          onClose={() => setAdding(false)}
          onSave={(v) => {
            setAdding(false);
            A.createTask(v);
          }}
        />
      )}

      {editing && data && (
        <TaskSheet
          mode="edit"
          me={me}
          users={users}
          lists={lists}
          task={tasks.find((t) => t.id === editing.id) ?? editing}
          subtasks={childrenOf.get(editing.id) ?? []}
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(v) => {
            const before = tasks.find((t) => t.id === editing.id) ?? editing;
            setEditing(null);
            A.updateTask(before.id, v, before);
          }}
          onDelete={() => {
            const id = editing.id;
            setEditing(null);
            A.deleteTask(id, tasks);
          }}
          onAddSub={(title) => A.createTask({ listId: editing.listId, parentId: editing.id, title })}
          onToggleSub={toggle}
          onDeleteSub={(s) => A.deleteTask(s.id, tasks)}
        />
      )}

      {menuOpen && (
        <Menu
          me={me}
          vapidKey={vapidKey}
          currentList={currentList}
          onLogout={onLogout}
          onClose={() => setMenuOpen(false)}
          onRename={(l) => {
            const n = prompt("リスト名を変更", l.name);
            if (n?.trim()) A.renameList(l.id, n);
          }}
          onDeleteList={(l) => {
            if (!confirm(`「${l.name}」とその中のタスクをすべて削除します。よろしいですか？`)) return;
            setView("today");
            A.deleteList(l.id).catch(console.error);
          }}
          onClearDone={(l) => A.clearCompleted(l.id, tasks)}
        />
      )}
    </div>
  );
}

// ---------- タスク追加・編集シート ----------
function TaskSheet(props: {
  mode: "new" | "edit";
  me: ClientUser;
  users: ClientUser[];
  lists: List[];
  task?: ClientTask;
  subtasks?: ClientTask[];
  initial: Partial<ClientTask>;
  onClose: () => void;
  onSave: (v: A.TaskInput) => void;
  onDelete?: () => void;
  onAddSub?: (title: string) => void;
  onToggleSub?: (t: ClientTask) => void;
  onDeleteSub?: (t: ClientTask) => void;
}) {
  const { mode, initial, users, lists, me } = props;
  const [title, setTitle] = useState(initial.title ?? "");
  const [assigneeId, setAssigneeId] = useState<string>(initial.assigneeId ?? "");
  const [listId, setListId] = useState<string>(initial.listId ?? lists[0]?.id ?? "");
  const [subTitle, setSubTitle] = useState("");
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const isSub = !!props.task?.parentId;

  useEffect(() => {
    if (mode === "new") titleRef.current?.focus();
  }, [mode]);

  const save = () => {
    if (!title.trim()) return props.onClose();
    props.onSave({
      listId,
      title,
      assigneeId: assigneeId || null,
    });
  };

  return (
    <div className="scrim" onClick={props.onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="sheet-handle" />
        <div className="sheet-head">
          {mode === "edit" ? (
            <button className="text-btn" onClick={props.onClose}>閉じる</button>
          ) : (
            <span />
          )}
          {mode === "edit" && props.onDelete && (
            <button
              className="text-btn danger"
              onClick={() => confirm("このタスクを削除しますか？") && props.onDelete!()}
            >
              削除
            </button>
          )}
        </div>

        {mode === "edit" && !isSub && (
          <select className="list-select" value={listId} onChange={(e) => setListId(e.target.value)}>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        )}

        <textarea
          ref={titleRef}
          className="title-input"
          placeholder="新しいタスク"
          value={title}
          rows={1}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              save();
            }
          }}
        />
        {!isSub && (
          <div className="field">
            <span className="field-label">担当</span>
            <div className="chips">
              <button className={"chip-btn" + (assigneeId === me.id ? " is-on" : "")} onClick={() => setAssigneeId(assigneeId === me.id ? "" : me.id)}>
                <Avatar u={me} size={18} /> 自分
              </button>
              <select className="assignee-select" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">未割り当て</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {mode === "edit" && !isSub && (
          <div className="field field-col">
            <span className="field-label">サブタスク</span>
            <ul className="sub-edit">
              {(props.subtasks ?? []).map((s) => (
                <li key={s.id} className={s.done ? "is-done" : ""}>
                  <Check done={s.done} onClick={() => props.onToggleSub?.(s)} />
                  <span className="sub-title">{s.title}</span>
                  <button className="icon-btn small" aria-label="削除" onClick={() => props.onDeleteSub?.(s)}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="sub-add"
              onSubmit={(e) => {
                e.preventDefault();
                if (subTitle.trim()) {
                  props.onAddSub?.(subTitle.trim());
                  setSubTitle("");
                }
              }}
            >
              <span className="plus">＋</span>
              <input placeholder="サブタスクを追加" value={subTitle} onChange={(e) => setSubTitle(e.target.value)} />
            </form>
          </div>
        )}

        <div className="sheet-actions">
          <button className="primary-btn" onClick={save} disabled={!title.trim()}>
            {mode === "new" ? "追加" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- メニュー（通知設定・リスト操作・ログアウト） ----------
function Menu(props: {
  me: ClientUser;
  vapidKey: string;
  currentList?: List;
  onLogout: () => void;
  onClose: () => void;
  onRename: (l: List) => void;
  onDeleteList: (l: List) => void;
  onClearDone: (l: List) => void;
}) {
  const { me, vapidKey, currentList } = props;
  const [pushState, setPushState] = useState<"unsupported" | "off" | "on" | "denied" | "loading">("loading");
  const [isStandalone, setStandalone] = useState(true);

  useEffect(() => {
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true,
    );
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapidKey) return setPushState("unsupported");
      if (Notification.permission === "denied") return setPushState("denied");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setPushState(sub ? "on" : "off");
    })();
  }, [vapidKey]);

  const enablePush = async () => {
    setPushState("loading");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setPushState(perm === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const r = await A.api("/api/push/subscribe", "POST", sub.toJSON());
      if (!r.ok) throw new Error("subscribe failed");
      setPushState("on");
    } catch {
      setPushState("off");
    }
  };

  const disablePush = async () => {
    setPushState("loading");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await A.api("/api/push/subscribe", "DELETE", { endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
    setPushState("off");
  };

  return (
    <div className="scrim" onClick={props.onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="sheet-handle" />
        <div className="me-row">
          <Avatar u={me} size={40} />
          <div>
            <div className="me-name">{me.name}</div>
            <div className="muted small">{me.email}</div>
          </div>
        </div>

        <div className="menu-group">
          <div className="menu-label">通知</div>
          {pushState === "unsupported" ? (
            <p className="muted small">
              {isStandalone
                ? "この端末・ブラウザはプッシュ通知に対応していません。"
                : "通知を受け取るには、先にホーム画面に追加してアプリとして開いてください（iPhoneは共有ボタン →「ホーム画面に追加」）。"}
            </p>
          ) : pushState === "denied" ? (
            <p className="muted small">通知がブロックされています。端末の設定から許可してください。</p>
          ) : (
            <button className="menu-item" disabled={pushState === "loading"} onClick={pushState === "on" ? disablePush : enablePush}>
              {pushState === "on" ? "🔔 通知オン（タップでオフ）" : "🔕 通知をオンにする"}
            </button>
          )}
          <p className="muted small">毎朝8時に「今日やること」と、タスクを割り当てられたときに通知します。</p>
        </div>

        {currentList && (
          <div className="menu-group">
            <div className="menu-label">リスト「{currentList.name}」</div>
            <button className="menu-item" onClick={() => { props.onClose(); props.onRename(currentList); }}>リスト名を変更</button>
            <button className="menu-item" onClick={() => { props.onClose(); props.onClearDone(currentList); }}>完了したタスクを削除</button>
            <button className="menu-item danger" onClick={() => { props.onClose(); props.onDeleteList(currentList); }}>リストを削除</button>
          </div>
        )}

        <div className="menu-group">
          <button className="menu-item" onClick={() => { props.onClose(); props.onLogout(); }}>ログアウト</button>
        </div>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

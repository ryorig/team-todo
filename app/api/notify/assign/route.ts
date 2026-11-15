import { NextResponse } from "next/server";
import { adminDb, verifyRequest } from "@/lib/admin";
import { pushToUser } from "@/lib/push";

// タスクを誰かに割り当てたとき、アプリから呼ばれる
export async function POST(req: Request) {
  const uid = await verifyRequest(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { taskId } = (await req.json()) as { taskId?: string };
  if (!taskId) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const db = adminDb();
  const t = (await db.collection("tasks").doc(taskId).get()).data();
  if (!t?.assigneeId || t.assigneeId === uid) return NextResponse.json({ ok: true, skipped: true });

  const by = (await db.collection("users").doc(uid).get()).data();
  await pushToUser(t.assigneeId, {
    title: `${by?.name ?? "メンバー"}さんからタスクが割り当てられました`,
    body: t.title,
    url: "/",
    tag: `assign-${taskId}`,
  });
  return NextResponse.json({ ok: true });
}

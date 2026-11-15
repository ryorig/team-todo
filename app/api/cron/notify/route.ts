import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { pushToUser } from "@/lib/push";

// 毎朝（vercel.json で設定）：担当者ごとに未完了タスクをまとめて通知
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const snap = await adminDb().collection("tasks").where("done", "==", false).get();

  const byUser = new Map<string, string[]>();
  for (const doc of snap.docs) {
    const t = doc.data();
    if (t.parentId || !t.assigneeId) continue;
    byUser.set(t.assigneeId, [...(byUser.get(t.assigneeId) ?? []), t.title]);
  }

  for (const [userId, all] of byUser) {
    await pushToUser(userId, {
      title: `未完了のタスク：${all.length}件`,
      body: all.slice(0, 3).join("、") + (all.length > 3 ? " ほか" : ""),
      url: "/",
      tag: `daily-${new Date().toISOString().slice(0, 10)}`,
    });
  }
  return NextResponse.json({ ok: true, users: byUser.size });
}

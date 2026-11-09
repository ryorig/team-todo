import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { pushToUser } from "@/lib/push";
import { todayStr } from "@/lib/date";

// 毎朝（vercel.json で設定）：担当者ごとに「今日やること」をまとめて通知
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const today = todayStr();
  const snap = await adminDb().collection("tasks").where("done", "==", false).get();

  const byUser = new Map<string, { overdue: string[]; today: string[] }>();
  for (const doc of snap.docs) {
    const t = doc.data();
    if (t.parentId || !t.assigneeId || !t.dueDate || t.dueDate > today) continue;
    const u = byUser.get(t.assigneeId) ?? { overdue: [], today: [] };
    (t.dueDate < today ? u.overdue : u.today).push(t.title);
    byUser.set(t.assigneeId, u);
  }

  for (const [userId, g] of byUser) {
    const parts: string[] = [];
    if (g.overdue.length) parts.push(`期限切れ${g.overdue.length}件`);
    if (g.today.length) parts.push(`今日${g.today.length}件`);
    const all = [...g.overdue, ...g.today];
    await pushToUser(userId, {
      title: `今日やること：${parts.join("・")}`,
      body: all.slice(0, 3).join("、") + (all.length > 3 ? " ほか" : ""),
      url: "/",
      tag: `daily-${today}`,
    });
  }
  return NextResponse.json({ ok: true, users: byUser.size });
}

import { NextResponse } from "next/server";
import { adminDb, verifyRequest } from "@/lib/admin";
import { subId } from "@/lib/push";

export async function POST(req: Request) {
  const uid = await verifyRequest(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sub = (await req.json()) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  await adminDb()
    .collection("pushSubs")
    .doc(subId(sub.endpoint))
    .set({ userId: uid, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, createdAt: Date.now() });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const uid = await verifyRequest(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { endpoint } = (await req.json()) as { endpoint?: string };
  if (endpoint) await adminDb().collection("pushSubs").doc(subId(endpoint)).delete();
  return NextResponse.json({ ok: true });
}

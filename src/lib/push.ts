import { createHash } from "node:crypto";
import * as webpush from "web-push";
import { adminDb } from "./admin";

let configured = false;
function setup() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@example.com", pub, priv);
  configured = true;
  return true;
}

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

export async function pushToUser(userId: string, payload: PushPayload) {
  if (!setup()) return;
  const snap = await adminDb().collection("pushSubs").where("userId", "==", userId).get();
  await Promise.all(
    snap.docs.map(async (doc) => {
      const s = doc.data() as { endpoint: string; p256dh: string; auth: string };
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
      } catch (e: unknown) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await doc.ref.delete(); // 期限切れの購読は掃除
      }
    }),
  );
}

// 購読の endpoint からドキュメントIDを作る（同じ端末は上書き）
export function subId(endpoint: string) {
  return createHash("sha256").update(endpoint).digest("hex");
}

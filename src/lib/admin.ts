import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// FIREBASE_SERVICE_ACCOUNT にはサービスアカウントの JSON をそのまま（または base64 で）入れる
function credentials() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT が設定されていません");
  const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  return cert(JSON.parse(json));
}

function app() {
  return getApps()[0] ?? initializeApp({ credential: credentials() });
}

export const adminDb = () => getFirestore(app());
export const adminAuth = () => getAuth(app());

// リクエストの Authorization: Bearer <IDトークン> を検証して uid を返す
export async function verifyRequest(req: Request): Promise<string | null> {
  const h = req.headers.get("authorization") ?? "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return null;
  try {
    const d = await adminAuth().verifyIdToken(token);
    // Firestore ルールと同じ「チームメンバーか」をユーザードキュメントの存在で確認
    const u = await adminDb().collection("users").doc(d.uid).get();
    return u.exists ? d.uid : null;
  } catch {
    return null;
  }
}

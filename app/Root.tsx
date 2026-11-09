"use client";

import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { saveProfile } from "./store";
import TodoApp from "./TodoApp";

const LAST_USER = "team-todo:user:v1";

export default function Root() {
  // 前回ログインしていた人は、Firebase の確認を待たずに画面を出す（開いた瞬間に表示）
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [cached, setCached] = useState<{ uid: string; name: string | null; email: string; image: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const c = localStorage.getItem(LAST_USER);
      if (c) setCached(JSON.parse(c));
    } catch {}
    getRedirectResult(auth).catch((e) => setError(String(e?.code ?? e)));
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        saveProfile().catch((e) => {
          if (e?.code === "permission-denied") setError("not-member");
        });
        try {
          localStorage.setItem(
            LAST_USER,
            JSON.stringify({ uid: u.uid, name: u.displayName, email: u.email, image: u.photoURL }),
          );
        } catch {}
      } else {
        setCached(null);
        try {
          localStorage.removeItem(LAST_USER);
        } catch {}
      }
    });
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  const login = async () => {
    setError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    try {
      // ホーム画面から開いたアプリではポップアップが使えないことがあるのでリダイレクト
      if (standalone) await signInWithRedirect(auth, provider);
      else await signInWithPopup(auth, provider);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "auth/popup-blocked") await signInWithRedirect(auth, provider);
      else if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") setError(code ?? "error");
    }
  };

  const logout = () => signOut(auth);

  if (error === "not-member") {
    return (
      <main className="login">
        <img src="/icons/icon-192.png" alt="" width={72} height={72} />
        <h1>チームToDo</h1>
        <p className="login-error">
          {auth.currentUser?.email} はこのチームに登録されていません。管理者に追加を依頼するか、別のアカウントでログインしてください。
        </p>
        <button className="google-btn" onClick={() => { setError(null); logout(); }}>
          別のアカウントでログイン
        </button>
      </main>
    );
  }

  const me = user
    ? { id: user.uid, name: user.displayName, email: user.email ?? "", image: user.photoURL }
    : user === undefined && cached
      ? { id: cached.uid, name: cached.name, email: cached.email, image: cached.image }
      : null;

  if (me) return <TodoApp me={me} ready={!!user} onLogout={logout} onDenied={() => setError("not-member")} />;

  if (user === undefined) return <div className="splash" />;

  return (
    <main className="login">
      <img src="/icons/icon-192.png" alt="" width={72} height={72} />
      <h1>チームToDo</h1>
      <p className="muted">開いた瞬間に、今日やることを。</p>
      {error && <p className="login-error">ログインできませんでした（{error}）。もう一度お試しください。</p>}
      <button className="google-btn" onClick={login}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Googleでログイン
      </button>
    </main>
  );
}

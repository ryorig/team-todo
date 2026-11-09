"use client";

import dynamic from "next/dynamic";
import { Component, type ErrorInfo, type ReactNode } from "react";

type BoundaryState = { error: Error | null };

class AppErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Team ToDo rendering error", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="login">
          <img src="/icons/icon-192.png" alt="" width={72} height={72} />
          <h1>チームToDo</h1>
          <p className="login-error">
            データの表示中にエラーが発生しました。ページを再読み込みしてください。
          </p>
          <button className="google-btn" onClick={() => window.location.reload()}>
            再読み込み
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

// Firebase はブラウザでだけ動かす（サーバーでは空の画面だけ返し、SW でキャッシュして即起動）
const Root = dynamic(() => import("./Root"), {
  ssr: false,
  loading: () => <div className="splash" />,
});

export default function ClientRoot() {
  return (
    <AppErrorBoundary>
      <Root />
    </AppErrorBoundary>
  );
}

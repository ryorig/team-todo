"use client";

import dynamic from "next/dynamic";

// Firebase はブラウザでだけ動かす（サーバーでは空の画面だけ返し、SW でキャッシュして即起動）
const Root = dynamic(() => import("./Root"), {
  ssr: false,
  loading: () => <div className="splash" />,
});

export default function ClientRoot() {
  return <Root />;
}

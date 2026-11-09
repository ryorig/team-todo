import type { NextConfig } from "next";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const nextConfig: NextConfig = {
  // firebase-admin はNode.js側で外部パッケージとして読み込む
  // （Next.jsのバンドルによる jose / jwks-rsa のESM変換エラーを防ぐ）
  serverExternalPackages: ["firebase-admin"],
  // Googleログインの画面を自分のドメイン経由で出す（iPhoneのホーム画面アプリでもログインできるように）
  async rewrites() {
    if (!projectId) return [];
    return [
      { source: "/__/auth/:path*", destination: `https://${projectId}.firebaseapp.com/__/auth/:path*` },
      { source: "/__/firebase/:path*", destination: `https://${projectId}.firebaseapp.com/__/firebase/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;

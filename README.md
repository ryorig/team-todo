# チームToDo（PWA ／ Firebase ＋ Vercel）

Google ToDo 風の見た目で、**開いた瞬間に「今日やること」が出る**チーム用ToDoアプリです。
スマホのホーム画面に追加すると、普通のアプリのように使えます。

## できること

- **今日やること画面（起動時のトップ）**：期限切れ → 今日 → 明日 → 今後7日間 → スター付き。「自分の担当／チーム全員」切替
- **リスト**（タブ）・**サブタスク**・**スター**・**期限**・**担当者**
- **リアルタイム同期**：誰かが更新すると全員の画面にすぐ反映（Firestore）
- **即起動・オフライン対応**：データを端末に保存しているので、開いた瞬間に表示。電波がなくても見られて、編集も後で自動送信
- **プッシュ通知**：毎朝8時（日本時間）に「今日やること」、タスクを割り当てられたら即通知
- **Googleログイン**：`firestore.rules` に書いたメンバーだけが使える

## 費用：すべて無料枠で動きます（クレジットカード登録なし）

| サービス | プラン | 無料枠の目安 |
|---|---|---|
| Vercel | Hobby | 個人・小規模チームなら十分。cron は1日1回まで |
| Firebase | **Spark（無料）** | Firestore 読み取り 5万回/日・書き込み 2万回/日・容量 1GB、Googleログイン無制限 |
| Google Cloud | — | Firebase を作ると裏で自動作成されます。**課金を有効にしない限り請求は発生しません** |

10人前後のチームで毎日使っても、無料枠の数%程度です。
Firebase の「Blaze（従量課金）」へのアップグレードは不要です（Cloud Functions を使わず、通知は Vercel から送る構成にしています）。

---

## セットアップ（初回だけ・20〜30分）

### 1. Firebase プロジェクトを作る
1. [console.firebase.google.com](https://console.firebase.google.com) に Google アカウントでログイン → **プロジェクトを追加**
   - Google アナリティクスは「無効」でOK
2. **構築 → Authentication → 始める → ログイン方法 → Google を有効化**（サポートメールを選んで保存）
3. **構築 → Firestore Database → データベースを作成**
   - ロケーション：`asia-northeast1（東京）`
   - 「本番環境モード」で開始
4. **Firestore → ルール** タブを開き、このフォルダの `firestore.rules` の中身を貼り付けて **公開**
   - ★ メンバーのメールアドレス／ドメインはここで管理します。最初に自分たちの分に書き換えてください
5. **プロジェクトの設定（⚙️）→ 全般 → マイアプリ → ウェブ（</>）** でアプリを登録
   → 表示される `apiKey` / `projectId` / `appId` をメモ
6. **プロジェクトの設定 → サービスアカウント → 新しい秘密鍵を生成** → JSON がダウンロードされる
   （※ この JSON はパスワードと同じ扱い。GitHub には絶対に上げないでください）

### 2. Vercel に公開する（nakamotoryoke@gmail.com のアカウント）
1. このフォルダを GitHub の新しいリポジトリ（Private 推奨）に push
2. [vercel.com](https://vercel.com) に nakamotoryoke@gmail.com でログイン → **Add New → Project** → リポジトリを選択
3. **Environment Variables** に `.env.example` の項目を入れて **Deploy**

| 変数 | 入れる値 |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` / `_PROJECT_ID` / `_APP_ID` | 手順1-5 の値 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | 最初は `<projectId>.firebaseapp.com` → 公開URLが決まったら手順3で差し替え |
| `FIREBASE_SERVICE_ACCOUNT` | 手順1-6 の JSON の中身をそのまま貼り付け |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | 手元で `npm install && npm run vapid` を実行した出力 |
| `VAPID_SUBJECT` | `mailto:nakamotoryoke@gmail.com` |
| `CRON_SECRET` | 長いランダム文字列（`openssl rand -hex 32` など） |

### 3. ログインを公開URLで動かす（iPhone のホーム画面アプリ対策）
公開URL（例：`team-todo.vercel.app`）が決まったら：
1. **Firebase → Authentication → 設定 → 承認済みドメイン** に `team-todo.vercel.app` を追加
2. [Google Cloud Console](https://console.cloud.google.com/apis/credentials)（Firebase と同じプロジェクトを選択）→ **認証情報 → 「Web client (auto created by Google Service)」** を開き、
   **承認済みのリダイレクト URI** に `https://team-todo.vercel.app/__/auth/handler` を追加して保存
   （この画面の操作は無料です。課金の設定は不要）
3. Vercel の `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` を `team-todo.vercel.app` に変更 → **Redeploy**

> ログイン画面を自分のドメイン経由で表示する設定です（`next.config.ts` の rewrites）。これをしないと、iPhone のホーム画面から開いたときにログインがループすることがあります。

### 4. メンバーに配る
1. `firestore.rules` にメンバーを追加して Firebase コンソールで公開
2. URL を共有して、各自スマホで：
   - **iPhone（Safari）**：共有ボタン →「ホーム画面に追加」→ アイコンから開く
   - **Android（Chrome）**：メニュー →「アプリをインストール」
3. 右上のアイコン →「通知をオンにする」
   - iPhone は **iOS 16.4 以降** かつ **ホーム画面から開いたとき** だけ通知が使えます

---

## 補足

- 毎朝の通知時刻は `vercel.json` の `"0 23 * * *"`（UTC 23時＝日本時間8時）で変更できます。
- 日付はすべて日本時間で判定しています（`src/lib/date.ts`）。
- 完了から30日を過ぎたタスクは画面に出しません。メニューの「完了したタスクを削除」で消せます。
- Firebase CLI を使う場合は `npx firebase-tools deploy --only firestore:rules` でもルールを公開できます。

## ファイル構成

```
app/page.tsx          ログイン判定（前回のユーザーなら即表示）
app/TodoApp.tsx       画面（今日やること・リスト・追加/編集シート・メニュー）
app/store.ts          Firestore の読み書き（リアルタイム購読）
app/api/push/...      通知の購読登録
app/api/notify/...    割り当て時の通知
app/api/cron/notify   毎朝の通知（Vercel Cron）
src/lib/firebase.ts   Firebase 初期化（オフラインキャッシュ有効）
src/lib/admin.ts      サーバー側 Firebase（サービスアカウント）
firestore.rules       アクセスできるメンバーの設定
public/sw.js          Service Worker（即起動・通知受信）
```

## ローカル開発
```bash
npm install
cp .env.example .env.local   # 値を埋める（AUTH_DOMAIN は <projectId>.firebaseapp.com）
npm run dev                  # http://localhost:3000（Firebase の承認済みドメインに localhost は最初から入っています）
```

# Basic Infrastructure System V2

このプロジェクトは、フロントエンドおよびバックエンドサービスの両方に Cloudflare のエコシステムを採用した、基本インフラシステムのモノレポ（Monorepo）です。

## 🏛️ システムアーキテクチャ

本プロジェクトは以下の構成で設計されています。

```mermaid
graph TD
    Front[frontend / Next.js] -->|HTTPS / JWT| Comm[community API / Hono]
    Front -->|HTTPS / JWT| Mem[member API / Hono]
    Comm -->|Hyperdrive TCP| DB[(PostgreSQL / Supabase)]
    Mem -->|Hyperdrive TCP| DB
```

*   **フロントエンド (`/frontend`)**: Next.js アプリケーション。OpenNext を利用して Cloudflare Pages にデプロイされます。
*   **コミュニティ API (`/community`)**: Hono および Zod OpenAPI を用いた Cloudflare Workers サービス。Discord Bot やコミュニティ連携を処理します。
*   **メンバー API (`/member`)**: Hono および Zod OpenAPI を用いた Cloudflare Workers サービス（コード内や設定ファイル上では `backend` と表記されます）。
*   **共有モジュール (`/share`)**: データベースのスキーマ定義（Drizzle ORM）や共通リレーションなど、各プロジェクトで共有するコードを配置します。

---

## 🚀 開発環境のセットアップ (Getting Started)

### 📌 前提条件
*   Node.js (v22以上、v24推奨)
*   npm
*   [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-update/) （Cloudflare の開発・デプロイツール）

### 1. 依存関係のインストール
プロジェクトのルート、または各ディレクトリで npm パッケージをインストールしてください。

```bash
# モノレポ全体のセットアップ (各ディレクトリで実行)
cd community && npm install
cd ../member && npm install
cd ../frontend && npm install
cd ..
```

### 2. 環境変数（`.env`）の設定
リポジトリのルートディレクトリに存在する `.env` ファイル（Git管理外）を作成・編集します。テンプレートとして `.env.example` をコピーして作成してください。

```bash
cp .env.example .env
```

**【重要】Hyperdrive ローカルエミュレーション設定**
ローカル開発時（`wrangler dev`）にも、Wrangler がローカルでデータベース接続プール（Hyperdrive）をエミュレートするため、以下の環境変数をルートの `.env` に設定する必要があります。

```ini
# Wrangler Hyperdrive Local Connection Emulation String
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="postgresql://username:password@host:5432/database"
```
*※ローカル開発でご自身の PostgreSQL（Docker 等）を使用する場合は、上記のアドレスをローカルDBのものに書き換えてください。*

### 3. 各プロジェクトのローカル起動
それぞれのディレクトリで開発サーバーを起動します。

*   **コミュニティ API** (ポート `8787`):
    ```bash
    cd community
    npm run dev
    ```
*   **メンバー API** (ポート `8788`):
    ```bash
    cd member
    npm run dev
    ```
*   **フロントエンド** (ポート `3000`):
    ```bash
    cd frontend
    npm run dev
    ```

---

## ☁️ 本番環境へのデプロイ手順 (Deployment)

Cookie 認証（Better Auth）のクロスドメイン制約（ブラウザによる `*.workers.dev` 間の Cookie 共有ブロック）を回避するため、本番環境は**同一のカスタムドメイン（サブドメイン）で運用します。**

*   フロントエンド: `https://mypage.yourdomain.com`
*   コミュニティAPI: `https://community-api.yourdomain.com`
*   メンバーAPI: `https://member-api.yourdomain.com`

### デプロイ順序
依存関係があるため、以下の順番でデプロイと設定を行ってください。

#### Step 1: バックエンド API のデプロイ
```bash
# community と member ディレクトリでそれぞれ実行
npm run deploy
```
*デプロイ後、Cloudflare ダッシュボードに表示される Workers の本番 URL をメモします。*

#### Step 2: API 側へのシークレット・環境変数の登録（初回、または設定変更時のみ）
Wrangler を使用して、本番 API Worker に環境変数を安全に登録します。一度登録すれば Cloudflare 側に暗号化されて永続化されるため、コードを再デプロイ（`wrangler deploy`）しても消えません。毎回のデプロイ時に実行する必要はありません。
```bash
# community と member それぞれのディレクトリで実行
npx wrangler secret put FRONTEND_URL    # 値: https://mypage.yourdomain.com (本番フロントURL)
npx wrangler secret put COMMUNITY_URL   # 値: https://community-api.yourdomain.com (本番コミュニティAPI URL)
npx wrangler secret put COOKIE_DOMAIN   # 値: yourdomain.com (Cookie共有用のルートドメイン)
```

#### Step 3: フロントエンド（Next.js）のデプロイ
Next.js はビルド時にクライアント用の環境変数（`NEXT_PUBLIC_`）を JS 内にハードコードするため、**ビルド実行時にシェル環境変数として本番URLを渡す必要があります。**

以下のコマンドを使用してビルド・デプロイを実行してください。

```bash
# /frontend ディレクトリで実行
NEXT_PUBLIC_COMMUNITY_API_URL="https://community-api.yourdomain.com" \
NEXT_PUBLIC_MEMBER_API_URL="https://member-api.yourdomain.com" \
CLOUDFLARE_ACCOUNT_ID="<あなたのCloudflareアカウントID>" \
npm run deploy
```

---

## 🛠️ 開発規約 (Development Conventions)

*   **Drizzle ORM & Schema**: スキーマ定義は `/share/drizzle/schema.ts` に一元管理されています。テーブル構造を変更した場合は、必ず `drizzle-kit generate` やマイグレーションを適用し、型定義を同期させてください。
*   **OpenAPI 仕様の遵守**: API のルートやバリデーションスキーマの定義には `@hono/zod-openapi` を厳格に使用し、コードと Swagger UI（`/ui` エンドポイント）が常に同期するように実装してください。
*   **型安全の確保**: バックエンドとフロントエンド間の API 通信は、Hono Client (`hc`) を用いて [frontend/src/lib/client.ts](file:///Users/horiuchi/workspace/BasicInfrastructureSystem/frontend/src/lib/client.ts) でクライアント化され、エンドツーエンドでの型安全性が保証されています。

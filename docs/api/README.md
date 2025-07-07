# Fithub Backend API ドキュメント

Fithubは、フィットネストラッキング（Google Fit）とGitHubコントリビューションを組み合わせて、総合的な自己成長のモチベーション向上を図るアプリケーションです。

## 🌐 ベースURL
```
http://localhost:3000/api
```

## 🔐 認証
すべての保護されたエンドポイントは、ヘッダーにJWTトークンが必要です：
```
Authorization: Bearer <your_jwt_token>
```

## 📚 API カテゴリ

### 1. 認証 & OAuth
- [認証API](./auth.md) - Google/GitHub OAuthによる登録・ログイン

### 2. ユーザーデータ & 分析
- [データAPI](./data.md) - フィットネスとGitHubデータの取得・同期

### 3. 管理 & テスト
- [管理API](./admin.md) - トークン管理とシステム確認

## 🔄 バックグラウンドジョブ
- [バックグラウンドジョブ](./background-jobs.md) - データ同期のためのバックグラウンド処理

## 🚀 クイックスタート

### 1. 新規アカウント登録
```bash
# ステップ1: Google OAuth URLを取得
GET /api/auth/google?callback_url=http://localhost:3001

# ステップ2: ユーザー認証後、コールバックにリダイレクト
GET /api/auth/google/callback?code=xxx&state=xxx

# 結果: JWTトークンとユーザー情報を受信
```

### 2. ユーザーデータの取得
```bash
# 今日のデータと過去7日間のデータを取得
GET /api/data/user
Authorization: Bearer <token>

# 週間/月間統計を取得
GET /api/data/stats  
Authorization: Bearer <token>
```

### 3. 手動同期
```bash
# データを即座に同期
POST /api/data/sync
Authorization: Bearer <token>
```

## 📊 データフロー

```
ユーザーログイン → OAuth → JWTトークン → API呼び出し → データベース
     ↓
自動同期（15分毎） → Google Fit + GitHub → データベース
     ↓  
フロントエンド表示 ← APIレスポンス ← 計算済み統計
```

## 🗄️ データベーススキーマ

### USERSテーブル
- `user_id` (VARCHAR(64), Primary Key)
- `user_name` (VARCHAR(255))
- `email` (VARCHAR(255))  
- `user_icon` (VARCHAR(500))

### EXERCISEテーブル  
- `user_id` (VARCHAR(64))
- `day` (DATE)
- `exercise_quantity` (INT) - 歩数

### CONTRIBUTIONSテーブル
- `user_id` (VARCHAR(64))
- `day` (DATE)  
- `count` (VARCHAR(10)) - GitHubコントリビューション数

### GOOGLE_OAUTH_TOKENSテーブル
- `user_id` (VARCHAR(64))
- `access_token` (TEXT)
- `refresh_token` (TEXT)
- `expires_at` (DATETIME)

### GITHUB_OAUTH_TOKENSテーブル  
- `user_id` (VARCHAR(64))
- `access_token` (TEXT)
- `username` (VARCHAR(255))

## ⚠️ エラーハンドリング

すべてのAPIは標準フォーマットで応答します：

**成功レスポンス:**
```json
{
  "success": true,
  "data": { ... },
  "message": "オプションメッセージ"
}
```

**エラーレスポンス:**
```json
{
  "success": false,
  "message": "エラーの説明",
  "error": "詳細なエラー情報（オプション）"
}
```

## 🔧 開発環境

### 環境変数
```env
JWT_SECRET=your_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=fithub_db
```

### 開発サーバーの開始
```bash
npm run dev
```

サーバーは `http://localhost:3000` で動作します

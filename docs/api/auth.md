# 認証API

## 概要
FithubはGoogle及びGitHubとのOAuth2フローを使用して登録・ログインを行います。成功後、他のAPIで使用するJWTトークンが返されます。

## エンドポイント

### 🔐 Google OAuth 登録

#### `GET /api/auth/google`

新規アカウント登録のためのGoogle OAuthフローを開始します。

**クエリパラメータ:**
- `callback_url` (必須): OAuth成功後のリダイレクトURL

**リクエスト例:**
```bash
GET /api/auth/google?callback_url=http://localhost:3001
```

**レスポンス:**
```json
{
  "success": true,
  "message": "Google OAuth URL generated successfully",
  "data": {
    "oauth_url": "https://accounts.google.com/oauth/authorize?client_id=...",
    "state": "random_state_string"
  }
}
```

#### `GET /api/auth/google/callback`

Google OAuthからのコールバックを処理します（Googleから自動的に呼び出されます）。

**クエリパラメータ:**
- `code` (必須): Googleからの認証コード
- `state` (必須): 検証用のステート文字列

**レスポンス:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "user_id": "google_123456789",
      "user_name": "田中太郎",
      "email": "tanaka@example.com",
      "user_icon": "https://lh3.googleusercontent.com/..."
    },
    "session_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_expires_in": "7 days",
    "oauth_data": {
      "google": {
        "google_id": "123456789",
        "name": "田中太郎",
        "email": "tanaka@example.com",
        "has_refresh_token": true
      }
    }
  }
}
```

### 🔐 GitHub OAuth 登録

#### `GET /api/auth/github/callback`

GitHub OAuthからのコールバックを処理します。

**クエリパラメータ:**
- `code` (必須): GitHubからの認証コード
- `state` (必須): 検証用のステート文字列

**レスポンス:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "user_id": "github_12345",
      "user_name": "tanaka-dev",
      "email": "tanaka@example.com",
      "user_icon": "https://avatars.githubusercontent.com/u/12345?v=4"
    },
    "session_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_expires_in": "7 days",
    "oauth_data": {
      "github": {
        "github_id": 12345,
        "username": "tanaka-dev",
        "name": "田中開発者",
        "public_repos": 25,
        "followers": 10
      }
    }
  }
}
```

### 🔑 ログインAPI

#### `GET /api/auth/login/google`

ログインのためのGoogle OAuthフローを開始します。

**クエリパラメータ:**
- `callback_url` (必須): OAuth成功後のリダイレクトURL

**リクエスト例:**
```bash
GET /api/auth/login/google?callback_url=http://localhost:3001
```

**レスポンス:**
```json
{
  "success": true,
  "message": "Google OAuth URL generated successfully",
  "data": {
    "oauth_url": "https://accounts.google.com/oauth/authorize?client_id=...",
    "state": "random_state_string"
  }
}
```

#### `GET /api/auth/login/github`

ログインのためのGitHub OAuthフローを開始します。

**クエリパラメータ:**
- `callback_url` (必須): OAuth成功後のリダイレクトURL

**リクエスト例:**
```bash
GET /api/auth/login/github?callback_url=http://localhost:3001
```

**レスポンス:**
```json
{
  "success": true,
  "message": "GitHub OAuth URL generated successfully",
  "data": {
    "oauth_url": "https://github.com/login/oauth/authorize?client_id=...",
    "state": "random_state_string"
  }
}
```

## 🔧 管理者エンドポイント

### `GET /api/auth/admin/token-report`

システム内のトークン状態のレポートを取得します（認証不要）。

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "total_users": 5,
    "google_tokens": {
      "total": 3,
      "with_refresh_token": 2,
      "expired": 1
    },
    "github_tokens": {
      "total": 4,
      "active": 4
    },
    "last_updated": "2025-07-07T10:30:00.000Z"
  }
}
```

### `POST /api/auth/admin/refresh-all`

可能なすべてのGoogleトークンをリフレッシュします（認証不要）。

**レスポンス:**
```json
{
  "success": true,
  "message": "Token refresh completed",
  "data": {
    "attempted": 5,
    "successful": 3,
    "failed": 2,
    "details": [
      {
        "user_id": "google_123",
        "status": "success",
        "new_expires_at": "2025-07-07T11:30:00.000Z"
      },
      {
        "user_id": "google_456", 
        "status": "failed",
        "error": "invalid_grant"
      }
    ]
  }
}
```

## 🔐 JWTトークン

### トークン形式
JWTトークンには以下の情報が含まれます：
```json
{
  "user_id": "google_123456789",
  "user_name": "田中太郎",
  "iat": 1625097600,
  "exp": 1625702400
}
```

### トークンの使用方法
保護されたエンドポイントのヘッダーでトークンを使用：
```bash
curl -H "Authorization: Bearer <your_jwt_token>" \
     http://localhost:3000/api/data/user
```

### トークンの有効期限
- JWTトークンの有効期限は7日間
- 自動リフレッシュはなし、期限切れ時は再ログインが必要

## ❌ エラーレスポンス

### バリデーションエラー
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "callback_url",
      "message": "callback_url is required"
    }
  ]
}
```

### OAuthエラー
```json
{
  "success": false,
  "message": "OAuth authorization failed",
  "error": "access_denied"
}
```

### 認証エラー
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

## 🌊 OAuthフロー図

```
フロントエンド          バックエンド           Google/GitHub
    |                      |                         |
    |-- GET /auth/google --|                         |
    |                      |-- URL生成 ------------->|
    |<-- OAuth URL返却 ----|                         |
    |                      |                         |
    |-- ユーザーURL実行 --->|                         |
    |                      |                         |
    |<-- ユーザー認証 -----|<-- コールバックリダイレクト--|
    |                      |                         |
    |-- GET /callback ---->|                         |
    |                      |-- コード交換 ----------->|
    |                      |<-- ユーザー情報取得 ------|
    |                      |-- DB保存 ------------->|
    |<-- JWT + ユーザーデータ--|                      |
```

## 💡 統合のヒント

### フロントエンド統合
```javascript
// 1. OAuth URLを取得
const response = await fetch('/api/auth/google?callback_url=http://localhost:3001');
const { data } = await response.json();

// 2. ポップアップウィンドウを開く
const popup = window.open(data.oauth_url, 'oauth', 'width=500,height=600');

// 3. コールバックメッセージを待機
window.addEventListener('message', (event) => {
  if (event.data.type === 'AUTH_SUCCESS') {
    const { user, session_token, oauth_data } = event.data;
    // トークンを保存してダッシュボードにリダイレクト
    localStorage.setItem('token', session_token);
    window.location.href = '/dashboard';
  }
});
```

### モバイル統合
```javascript
// アプリ内ブラウザまたはWebViewを使用
const authUrl = await fetch('/api/auth/google?callback_url=myapp://oauth/callback');
// authUrlでWebViewを開く
// アプリでディープリンクコールバックを処理
```

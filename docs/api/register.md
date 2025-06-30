# Registration API Documentation

## フロー概要
```
1. Firebase認証 → Firebase tokenを取得
2. Firebase tokenを送信 → Google OAuth URLを受信
3. Google OAuth URLを開く → GitHub OAuth URLを受信  
4. GitHub OAuth URLを開く → アカウント作成完了
```

### フロントエンド実装の流れ
1. **Firebase認証**: Firebase SDKでログイン、tokenを取得
2. **API呼び出し**: `/api/auth/verify-firebase`にtoken送信
3. **OAuth処理**: 
   - 新規ユーザー → `google_oauth_url`を開く
   - 既存ユーザー → `session_token`でログイン完了
4. **Google OAuth完了後**: `github_oauth_url`を開く
5. **GitHub OAuth完了後**: `session_token`でアカウント作成完了

---

## 1. Firebase認証検証

**POST** `/api/auth/verify-firebase`

### Request
```json
{
  "firebase_id_token": "eyJhbGciOiJSUzI1NiIs..."
}
```

### Response

**既存ユーザー (ログイン完了):**
```json
{
  "success": true,
  "is_new_user": false,
  "session_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "user_id": "7Mpj4mMlmNbyOU7k1GbwWmvSv12",
    "user_name": "田中太郎",
    "user_icon": "https://lh3.googleusercontent.com/...",
    "email": "tanaka@example.com"
  }
}
```

**新規ユーザー (OAuth継続):**
```json
{
  "success": true,
  "is_new_user": true,
  "temp_session_token": "eyJhbGciOiJIUzI1NiIs...",
  "google_oauth_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "next_step": "redirect_to_google_oauth"
}
```

> **フロントエンド**: `google_oauth_url`をwebview/popupで開く

---

## 2. Google OAuth コールバック

**GET** `/api/auth/google/callback?code={code}&state={state}`

> **注意**: このAPIはOAuth callbackで自動実行される

### Response
```json
{
  "success": true,
  "message": "Google OAuth 認証成功。GitHub認証を開始してください。",
  "temp_session_token": "eyJhbGciOiJIUzI1NiIs...",
  "github_oauth_url": "https://github.com/login/oauth/authorize?...",
  "next_step": "redirect_to_github_oauth",
  "google_data": {
    "google_id": "108234567890123456789",
    "name": "田中太郎",
    "email": "tanaka@example.com",
    "picture": "https://lh3.googleusercontent.com/..."
  }
}
```

> **フロントエンド**: `github_oauth_url`をwebview/popupで開く

---

## 3. GitHub OAuth コールバック (完了)

**GET** `/api/auth/github/callback?code={code}&state={state}`

> **注意**: このAPIはOAuth callbackで自動実行される

### Response
```json
{
  "success": true,
  "message": "アカウント作成が完了しました！",
  "session_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "user_id": "7Mpj4mMlmNbyOU7k1GbwWmvSv12",
    "user_name": "田中太郎",
    "user_icon": "https://lh3.googleusercontent.com/...",
    "email": "tanaka@example.com"
  },
  "oauth_data": {
    "google": {
      "google_id": "108234567890123456789",
      "connected": true
    },
    "github": {
      "github_id": 12345678,
      "username": "tanaka-taro",
      "connected": true
    }
  }
}
```

> **フロントエンド**: `session_token`を保存してログイン完了

---

## 重要な注意事項

### OAuth URL処理
- **Web**: `window.open(oauthUrl)` でpopup表示
- **Mobile**: WebViewやSafariViewController/Chrome Custom Tabsでpopup表示
- **React Native**: `WebBrowser.openAuthSessionAsync()`等使用

### セッション管理
- `temp_session_token`: OAuth中の一時的なトークン
- `session_token`: ログイン完了後の永続トークン

### フロントエンド設定
- **Firebase**: 通常のFirebase設定のみ必要
- **GitHub OAuth**: フロントエンド設定不要（全てバックエンドで処理）

---

## エラーレスポンス

**400 Bad Request:**
```json
{
  "success": false,
  "message": "エラーメッセージ",
  "error_code": "ERROR_CODE"
}
```

**主要エラーコード:**
- `OAUTH_ERROR` - OAuth認証エラー
- `EMAIL_MISMATCH` - メールアドレス不一致
- `SESSION_EXPIRED` - セッション期限切れ
- `GOOGLE_OAUTH_DATA_MISSING` - Google OAuth データ不足

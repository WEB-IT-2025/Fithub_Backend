# Fithub Authentication API Documentation

## 🔥 **完全なOAuth認証フロー概要**
```
1. Firebase認証 → Firebase ID token取得
2. POST /api/auth/verify-firebase → Google OAuth URL (新規) or session token (既存)
3. Google OAuth popup → GitHub OAuth URL
4. GitHub OAuth popup → アカウント作成完了 + final session token
```

### 🎯 **実装の特徴**
- **Adaptive Response**: Web (redirect) / Mobile (JSON) 自動判定
- **Popup OAuth Flow**: フロントエンドでpopup window使用
- **Comprehensive Logging**: 各ステップの詳細ログ
- **Error Handling**: 明確なエラーコードとメッセージ
- **Token Management**: Firebase, Google, GitHub, Session tokens管理

---

## 1. Firebase認証検証

**POST** `/api/auth/verify-firebase`

### Request
```json
{
  "firebase_id_token": "eyJhbGciOiJSUzI1NiIs...",
  "google_access_token": "ya29.a0AWY7CknV..." // Optional: Google OAuthをスキップ
}
```

> **💡 重要**: `google_access_token`が提供された場合、Google OAuth stepをスキップしてGitHub OAuthに直接進みます。

### Response

**✅ 既存ユーザー (ログイン完了):**
```json
{
  "success": true,
  "is_new_user": false,
  "message": "ログインが完了しました！",
  "session_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "user_id": "7Mpj4mMlmNbyOU7k1GbwWmvSv12",
    "user_name": "田中太郎",
    "user_icon": "https://lh3.googleusercontent.com/...",
    "email": "tanaka@example.com"
  },
  "oauth_data": {
    "google": { "connected": true },
    "github": { "connected": true }
  }
}
```

**新規ユーザー (OAuth継続):**
```json
{
  "success": true,
```

**🆕 新規ユーザー (Google OAuth必要):**
```json
{
  "success": true,
  "message": "Firebase認証成功。Google認証を開始してください。",
  "is_new_user": true,
  "temp_session_token": "eyJhbGciOiJIUzI1NiIs...",
  "google_oauth_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "next_step": "redirect_to_google_oauth",
  "firebase_data": {
    "firebase_uid": "7Mpj4mMlmNbyOU7k1GbwWmvSv12",
    "user_name": "田中太郎",
    "user_icon": "https://lh3.googleusercontent.com/...",
    "email": "tanaka@example.com"
  }
}
```

**🎯 新規ユーザー (Google Access Token提供済み - GitHub OAuth直行):**
```json
{
  "success": true,
  "message": "Firebase認証成功。GitHub認証を開始してください。",
  "is_new_user": true,
  "temp_session_token": "eyJhbGciOiJIUzI1NiIs...",
  "github_oauth_url": "https://github.com/login/oauth/authorize?...",
  "next_step": "redirect_to_github_oauth",
  "google_data": {
    "google_id": "109919588014687104867",
    "name": "田中太郎",
    "email": "tanaka@example.com",
    "picture": "https://lh3.googleusercontent.com/..."
  }
}
```

---

## 2. Google OAuth コールバック

**GET** `/api/auth/google/callback?code={code}&state={state}`

> **⚠️ 注意**: このAPIはOAuth callbackで自動実行されます。

### Response Types

**📱 Mobile/API Response (JSON):**
```json
{
  "success": true,
  "message": "Google OAuth認証成功。GitHub認証を開始してください。",
  "temp_session_token": "eyJhbGciOiJIUzI1NiIs...",
  "github_oauth_url": "https://github.com/login/oauth/authorize?...",
  "next_step": "redirect_to_github_oauth",
  "google_data": {
    "google_id": "109919588014687104867",
    "name": "田中太郎",
    "email": "tanaka@example.com",
    "picture": "https://lh3.googleusercontent.com/..."
  }
}
```

**🌐 Web Response (Redirect):**
```
Redirect to: /auth/callback?success=true&message=...&temp_session_token=...&github_oauth_url=...
```

---

## 3. GitHub OAuth コールバック (🎉 アカウント作成完了)

**GET** `/api/auth/github/callback?code={code}&state={state}`

> **⚠️ 注意**: このAPIはOAuth callbackで自動実行されます。

### Response Types

**📱 Mobile/API Response (JSON):**
```json
{
  "success": true,
  "message": "アカウント作成が完了しました！Fithubへようこそ！",
  "session_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "user_id": "7Mpj4mMImNbyOU7k1IGbwWmvSv12",
    "user_name": "HUYNH NGUYEN DUC",
    "user_icon": "https://lh3.googleusercontent.com/...",
    "email": "duchuynhnguyen1906@gmail.com"
  },
  "oauth_data": {
    "google": {
      "google_id": "109919588014687104867",
      "name": "HUYNH NGUYEN DUC",
      "email": "duchuynhnguyen1906@gmail.com",
      "picture": "https://lh3.googleusercontent.com/...",
      "connected": true
    },
    "github": {
      "github_id": 115116373,
      "username": "huynhnguyen1906",
      "name": "Nguyen Duc Huynh",
      "email": "duchuynhnguyen1906@gmail.com",
      "avatar_url": "https://avatars.githubusercontent.com/u/115116373?v=4",
      "public_repos": 36,
      "followers": 26,
      "connected": true
    }
  },
  "initial_sync": {
    "github_repos": 5
  }
}
```

**🌐 Web Response (Redirect to callback page):**
```
Redirect to: /auth/callback?success=true&message=...&session_token=...&user_data=...&oauth_data=...
```

> **💾 フロントエンド**: `session_token`を保存してログイン完了処理

---

## 🔄 **Adaptive Response System**

Backend automatically detects request type and responds accordingly:

- **🌐 Web (Browser/Popup)**: Redirects to `/auth/callback` with URL parameters
- **📱 Mobile/API**: Returns JSON response directly

**Detection Logic:**
```typescript
const userAgent = req.headers['user-agent'] || ''
const isWebRequest = userAgent.includes('Mozilla') && !userAgent.includes('Mobile')
```

---

## 🎯 **最適化されたFlow: Google Access Token直接提供**

Firebase認証時に`google_access_token`が既に利用可能な場合（例：フロントエンドでFirebase Authentication + Google OAuth同時実行）、システムは自動的にGoogle OAuth stepをスキップしてGitHub OAuthに直接進みます。

### 🚀 利点:
- **高速化**: OAuth step数の削減（3step → 2step）
- **UX向上**: 待機時間とpopup数削減
- **効率性**: リソース使用量最適化

### 💻 実装例:
```javascript
// Firebase Authentication with Google Provider
const result = await signInWithPopup(auth, googleProvider);
const firebaseToken = await result.user.getIdToken();
const googleAccessToken = GoogleAuthProvider.credentialFromResult(result)?.accessToken;

// Send both tokens to backend (Google OAuth step will be skipped)
const response = await fetch('/api/auth/verify-firebase', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firebase_id_token: firebaseToken,
    google_access_token: googleAccessToken // Skip Google OAuth step
  })
});
```

---

## 🔧 **フロントエンド実装ガイド**

### OAuth Popup Handler
```javascript
// Handle OAuth popup flow
async function handleOAuthFlow(oauthUrl) {
  return new Promise((resolve, reject) => {
    const popup = window.open(oauthUrl, 'oauth', 'width=500,height=600');
    
    const messageHandler = (event) => {
      if (event.source !== popup) return;
      
      if (event.data.type === 'AUTH_SUCCESS') {
        popup.close();
        window.removeEventListener('message', messageHandler);
        resolve(event.data.data);
      } else if (event.data.type === 'AUTH_ERROR') {
        popup.close();
        window.removeEventListener('message', messageHandler);
        reject(new Error(event.data.error));
      }
    };
    
    window.addEventListener('message', messageHandler);
  });
}
```

### Session Token Storage
```javascript
// Save session token and user data
function saveAuthData(authResult) {
  localStorage.setItem('session_token', authResult.session_token);
  localStorage.setItem('user_data', JSON.stringify(authResult.user));
  localStorage.setItem('oauth_data', JSON.stringify(authResult.oauth_data));
}
```

---

## 📋 **Token Expiry & Refresh**

### Token有効期限:
- **Google Access Token**: 1時間 (3600秒)
- **GitHub Access Token**: 長期間 (数年、refresh token無し)
- **Firebase ID Token**: 1時間 (Firebase SDKが自動更新)
- **Session Token (JWT)**: 7日間

### 🔄 Future Enhancement:
```javascript
// Background token refresh service (将来実装予定)
// - Google refresh token使用
// - Firebase token自動更新
// - Session token renewal
```

---

## ❌ **エラーレスポンス**

**400 Bad Request:**
```json
{
  "success": false,
  "message": "エラーメッセージ",
  "error_code": "ERROR_CODE"
}
```

**📋 主要エラーコード:**
- `INVALID_FIREBASE_TOKEN` - Firebase token無効
- `OAUTH_ERROR` - OAuth認証エラー
- `EMAIL_MISMATCH` - メールアドレス不一致
- `SESSION_EXPIRED` - セッション期限切れ
- `GOOGLE_OAUTH_DATA_MISSING` - Google OAuth データ不足
- `MISSING_OAUTH_PARAMS` - OAuth パラメータ不足
- `OAUTH_PROCESSING_ERROR` - OAuth処理エラー
- `POPUP_BLOCKED` - Popup blocked by browser

---

## 🎯 **Production Checklist**

### ✅ 完了済み:
- [x] Firebase Authentication integration
- [x] Google OAuth flow with Fitness API scopes
- [x] GitHub OAuth flow with repository access
- [x] Database user creation and token storage
- [x] Adaptive response (Web/Mobile)
- [x] Comprehensive error handling
- [x] Session token management
- [x] Popup OAuth flow for web

### 🔄 今後の改善:
- [ ] Background token refresh service
- [ ] Rate limiting for auth endpoints
- [ ] Advanced security features
- [ ] Mobile deep linking support
- [ ] Auth analytics and monitoring

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "セッションが期限切れです",
  "error_code": "SESSION_EXPIRED"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "OAuth処理中にエラーが発生しました",
  "error_code": "OAUTH_PROCESSING_ERROR"
}
```

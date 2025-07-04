# Fithub Authentication API Documentation

## 🔥 **最新OAuth認証フロー概要 (NEW FLOW)**
```
1. GET /api/auth/google → Google OAuth URL取得
2. Google OAuth popup → GitHub OAuth URL取得
3. GitHub OAuth popup → アカウント作成完了 + final session token
```

### 🎯 **実装の特徴**
- **Direct OAuth Flow**: Firebase不要、GoogleとGitHubのみ
- **Adaptive Response**: Web (redirect) / Mobile (JSON) 自動判定
- **Popup OAuth Flow**: フロントエンドでpopup window使用
- **Comprehensive Logging**: 各ステップの詳細ログ
- **Error Handling**: 明確なエラーコードとメッセージ
- **Token Management**: Google, GitHub, Session tokens管理

---

## 1. Google OAuth 開始

**GET** `/api/auth/google`

### Request
リクエストボディなし

### Response

**✅ Google OAuth URL生成成功:**
```json
{
  "success": true,
  "message": "Google OAuth URL generated successfully",
  "google_oauth_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
  "state": "a1b2c3d4e5f6g7h8...",
  "next_step": "redirect_to_google_oauth"
}
```

> **💡 重要**: `state`はCSRF保護のためのパラメータです。フロントエンドで保存してください。

---

## 2. Google OAuth コールバック

**GET** `/api/auth/google/callback?code={code}&state={state}`

> **⚠️ 注意**: このAPIはOAuth callbackで自動実行されます。

### Response Types

**✅ 既存ユーザー (ログイン完了):**
```json
{
  "success": true,
  "message": "Login successful",
  "is_new_user": false,
  "session_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "user_id": "user_1720024567_abc123def456",
    "user_name": "田中太郎",
    "user_icon": "https://lh3.googleusercontent.com/...",
    "email": "tanaka@example.com"
  }
}
```

**🆕 新規ユーザー (GitHub OAuth継続):**
```json
{
  "success": true,
  "message": "Google OAuth認証成功。GitHub認証を開始してください。",
  "is_new_user": true,
  "next_step": "redirect_to_github_oauth",
  "temp_session_token": "temp_abc123def456ghi789",
  "github_oauth_url": "https://github.com/login/oauth/authorize?...",
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
Web requests are automatically redirected to the frontend callback page
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

## 🔧 **フロントエンド実装ガイド**

### Complete OAuth Flow Example
```javascript
async function startAuthFlow() {
  try {
    // Step 1: Get Google OAuth URL
    const response = await fetch('http://localhost:3000/api/auth/google');
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    // Step 2: Open Google OAuth popup
    const popup = window.open(data.google_oauth_url, 'oauth', 'width=500,height=600');
    
    // Step 3: Monitor popup for completion
    const authResult = await monitorPopup(popup);
    
    // Step 4: Save auth data
    saveAuthData(authResult);
    
    console.log('✅ Authentication successful!', authResult);
  } catch (error) {
    console.error('❌ Authentication failed:', error);
  }
}

function monitorPopup(popup) {
  return new Promise((resolve, reject) => {
    const checkPopup = () => {
      try {
        if (popup.closed) {
          reject(new Error('Popup closed by user'));
          return;
        }
        
        const url = popup.location.href;
        if (url.includes('/auth/callback') && url.includes('success=true')) {
          const params = new URLSearchParams(popup.location.search);
          const result = {
            success: params.get('success') === 'true',
            session_token: params.get('session_token'),
            user: JSON.parse(decodeURIComponent(params.get('user_data') || '{}')),
            oauth_data: JSON.parse(decodeURIComponent(params.get('oauth_data') || '{}'))
          };
          
          popup.close();
          resolve(result);
          return;
        }
      } catch (e) {
        // Cross-origin error is expected, continue polling
      }
      
      setTimeout(checkPopup, 1000);
    };
    
    checkPopup();
  });
}

function saveAuthData(authResult) {
  localStorage.setItem('session_token', authResult.session_token);
  localStorage.setItem('user_data', JSON.stringify(authResult.user));
  localStorage.setItem('oauth_data', JSON.stringify(authResult.oauth_data));
}
```

---

## 📋 **Token Management**

### Token有効期限:
- **Google Access Token**: 1時間 (3600秒)
- **Google Refresh Token**: 長期間 (background更新用)
- **GitHub Access Token**: 長期間 (refresh token無し)
- **Session Token (JWT)**: 7日間

### 🔄 Token Refresh (自動):
```javascript
// Background token refresh service (実装済み)
// - Google refresh tokenでaccess token更新
// - Session token自動renewal
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
- `OAUTH_ERROR` - OAuth認証エラー
- `MISSING_OAUTH_PARAMS` - OAuth パラメータ不足
- `EMAIL_MISMATCH` - メールアドレス不一致 (Legacy flow)
- `SESSION_EXPIRED` - セッション期限切れ
- `GOOGLE_OAUTH_DATA_MISSING` - Google OAuth データ不足
- `OAUTH_PROCESSING_ERROR` - OAuth処理エラー
- `OAUTH_INIT_FAILED` - OAuth初期化失敗

---

## 🎯 **Production Ready Features**

### ✅ 実装済み:
- [x] Direct Google OAuth flow (No Firebase required)
- [x] GitHub OAuth integration with repository access
- [x] Database user creation and token storage
- [x] Google Fitness API scopes for activity data
- [x] Adaptive response (Web redirect/Mobile JSON)
- [x] Comprehensive error handling and logging
- [x] Session token management (JWT)
- [x] Popup OAuth flow for web applications
- [x] CSRF protection with state parameters
- [x] Google refresh token handling

### 🚀 Architecture Benefits:
- **Simplified Flow**: 3 steps instead of 4 (no Firebase dependency)
- **Better Performance**: Fewer API calls and redirects
- **Enhanced Security**: CSRF protection, proper token management
- **Mobile/Web Compatible**: Adaptive response system
- **Production Ready**: Comprehensive logging and error handling

---

## 📱 **Legacy Flow (Backward Compatibility)**

For applications still using Firebase Authentication, the legacy endpoints remain available:

**POST** `/api/auth/verify-firebase`
- Supports Firebase ID token verification
- Can skip Google OAuth if `google_access_token` provided
- Maintains backward compatibility

> **💡 Recommendation**: New implementations should use the direct Google OAuth flow for better performance and simpler architecture.
```json
{
  "success": false,
  "message": "OAuth処理中にエラーが発生しました",
  "error_code": "OAUTH_PROCESSING_ERROR"
}
```

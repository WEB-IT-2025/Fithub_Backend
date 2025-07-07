// src/constants/messages.ts

// Auth related messages
export const AUTH_MESSAGES = {
    // User existence
    USER_ALREADY_EXISTS: 'ユーザーは既に存在します。ログインエンドポイントをご利用ください。',
    USER_NOT_FOUND: 'ユーザーが見つかりません',

    // Session tokens
    TEMP_SESSION_INVALID: '無効または期限切れの一時セッショントークンです',
    SESSION_TOKEN_INVALID: '無効なセッショントークンです',
    SESSION_EXPIRED: 'セッションの有効期限が切れました。再度ログインしてください。',
    TOKEN_NOT_FOUND: 'トークンが見つかりません',
    TOKEN_REQUIRED: 'Authorization Bearerトークンが必要です',

    // OAuth
    INVALID_REQUEST_PARAMETERS: 'リクエストパラメータが無効です',
    OAUTH_CODE_REQUIRED: 'OAuth認証コードが必要です',
    OAUTH_ERROR: 'OAuth認証エラーが発生しました',

    // Google OAuth specific
    GOOGLE_ACCOUNT_NOT_REGISTERED: 'このGoogleアカウントはまだ登録されていません。先に新規登録を行ってください。',
    GOOGLE_LOGIN_SUCCESS: 'Googleアカウントでのログインが成功しました',
    GOOGLE_REGISTRATION_SUCCESS:
        'Googleアカウントでの新規登録が成功しました。GitHubアカウントとの連携を行ってください。',
    GOOGLE_ACCOUNT_ALREADY_EXISTS: 'このGoogleアカウントは既に登録されています。自動的にログインしました。',
    GOOGLE_OAUTH_FAILED: 'Google OAuth認証に失敗しました',

    // GitHub linking
    GITHUB_CODE_REQUIRED: 'GitHub認証コードが必要です',
    GITHUB_LINKING_SUCCESS: 'GitHubアカウントとの連携が完了しました',
    GITHUB_LOGIN_SUCCESS: 'GitHubアカウントでのログインが成功しました',
    GITHUB_ACCOUNT_ALREADY_EXISTS: 'このGitHubアカウントは既に登録されています。自動的にログインしました。',
    GITHUB_ALREADY_LINKED: 'このGitHubアカウントは既に他のユーザーに連携されています',
    GITHUB_OAUTH_FAILED: 'GitHub OAuth認証に失敗しました',

    // Account creation
    ACCOUNT_CREATION_SUCCESS: 'アカウントの作成が完了しました',
    ACCOUNT_CREATION_FAILED: 'アカウントの作成に失敗しました',

    // Login
    LOGIN_SUCCESS: 'ログインが成功しました',
    LOGIN_FAILED: 'ログインに失敗しました',

    // Database errors (for client)
    DATABASE_ERROR: 'データベースエラーが発生しました。しばらく経ってから再度お試しください。',

    // OAuth errors (for client)
    OAUTH_TOKEN_EXCHANGE_FAILED: 'OAuth認証に失敗しました。再度お試しください。',
    OAUTH_USER_INFO_FAILED: 'ユーザー情報の取得に失敗しました。再度お試しください。',

    // Registration flow
    GOOGLE_REGISTRATION_START: 'Google OAuth 認証成功。GitHub認証を開始してください。',
    GOOGLE_NEW_ACCOUNT: 'このGoogleアカウントは新規登録です',
    GOOGLE_OAUTH_DATA_NOT_FOUND: 'Google OAuth データが見つかりません。最初からやり直してください。',
    REGISTRATION_COMPLETE: 'アカウント作成が完了しました！Fithubへようこそ！',

    // GitHub specific
    GITHUB_ACCOUNT_NOT_REGISTERED: 'このGitHubアカウントはまだ登録されていません。先に新規登録を行ってください。',
    GITHUB_ALREADY_LINKED_TO_OTHER: 'このGitHubアカウントは既に他のユーザーに連携されています',

    // Processing errors
    GOOGLE_OAUTH_PROCESSING_ERROR: 'Google OAuth処理中にエラーが発生しました。',
    GITHUB_OAUTH_PROCESSING_ERROR: 'GitHub OAuth処理中にエラーが発生しました。',
}

// General API messages
export const GENERAL_MESSAGES = {
    SUCCESS: '成功',
    FAILED: '失敗',
    NOT_FOUND: '見つかりません',
    INTERNAL_ERROR: '内部サーバーエラーが発生しました',
    VALIDATION_ERROR: '入力データが無効です',
    BAD_REQUEST: '不正なリクエストです',
}

// API Success Messages (for informational responses)
export const API_MESSAGES = {
    GOOGLE_OAUTH_URL_GENERATED: 'Google OAuth URL generated successfully',
    TOKEN_EXPIRY_REPORT_GENERATED: 'Token expiry report generated successfully',
    OAUTH_INITIATION_FAILED: 'Failed to initiate OAuth',
}

// Validation messages for express-validator
export const VALIDATION_MESSAGES = {
    FIELD_REQUIRED: (field: string) => `${field}は必須です`,
    FIELD_INVALID: (field: string) => `${field}の形式が無効です`,
    FIELD_TOO_SHORT: (field: string, min: number) => `${field}は${min}文字以上である必要があります`,
    FIELD_TOO_LONG: (field: string, max: number) => `${field}は${max}文字以下である必要があります`,
    EMAIL_INVALID: 'メールアドレスの形式が無効です',
    TOKEN_FORMAT_INVALID: 'トークンの形式が無効です',
}

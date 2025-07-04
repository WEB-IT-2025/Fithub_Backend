// src/constants/messages.ts

// Auth related messages
export const AUTH_MESSAGES = {
    // Firebase verification
    FIREBASE_TOKEN_REQUIRED: 'Firebase IDトークンが必要です',
    FIREBASE_TOKEN_INVALID: '無効なFirebase IDトークンです',
    FIREBASE_VERIFICATION_SUCCESS: 'Firebase認証が成功しました。GitHubアカウントとの連携を続行してください。',

    // User existence
    USER_ALREADY_EXISTS: 'ユーザーは既に存在します。ログインエンドポイントをご利用ください。',
    USER_NOT_FOUND: 'ユーザーが見つかりません',

    // Session tokens
    TEMP_SESSION_INVALID: '無効または期限切れの一時セッショントークンです',
    SESSION_TOKEN_INVALID: '無効なセッショントークンです',
    SESSION_EXPIRED: 'セッションの有効期限が切れました。再度ログインしてください。',
    TOKEN_NOT_FOUND: 'トークンが見つかりません',

    NO_PERMISSION: 'この操作を行う権限がありません',
    // OAuth
    INVALID_REQUEST_PARAMETERS: 'リクエストパラメータが無効です',
    OAUTH_CODE_REQUIRED: 'OAuth認証コードが必要です',
    OAUTH_ERROR: 'OAuth認証エラーが発生しました',

    // GitHub linking
    GITHUB_CODE_REQUIRED: 'GitHub認証コードが必要です',
    GITHUB_LINKING_SUCCESS: 'GitHubアカウントとの連携が完了しました',

    // Account creation
    ACCOUNT_CREATION_SUCCESS: 'アカウントの作成が完了しました',
    ACCOUNT_CREATION_FAILED: 'アカウントの作成に失敗しました',

    // Login
    LOGIN_SUCCESS: 'ログインが成功しました',
    LOGIN_FAILED: 'ログインに失敗しました',
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

// Validation messages for express-validator
export const VALIDATION_MESSAGES = {
    FIELD_REQUIRED: (field: string) => `${field}は必須です`,
    FIELD_INVALID: (field: string) => `${field}の形式が無効です`,
    FIELD_TOO_SHORT: (field: string, min: number) => `${field}は${min}文字以上である必要があります`,
    FIELD_TOO_LONG: (field: string, max: number) => `${field}は${max}文字以下である必要があります`,
    EMAIL_INVALID: 'メールアドレスの形式が無効です',
    TOKEN_FORMAT_INVALID: 'トークンの形式が無効です',
}

export const EXERCISE_MESSAGES = {
    RECORD_SUCCESS: '運動量を記録しました',
}
//ミッション
export const MISSION_MESSAGES = {
    CREATED: 'ミッション情報を登録しました。',
    DELETED: 'ミッションを削除しました。',
    NOT_FOUND: 'ミッションが見つかりません。',
    NO_PERMISSION: 'この操作を行う権限がありません。',
    STATUS_ERROR: 'ミッション情報の取得に失敗しました。',
    NOT_CLEARED: 'ミッションをクリアしていません。',
}

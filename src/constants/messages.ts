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
    TOKEN_NOT_FOUND: 'トークンが見つかりません',
    TOKEN_REQUIRED: 'Authorization Bearerトークンが必要です',

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

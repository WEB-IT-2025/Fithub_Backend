# Shop API Documentation

## 概要
ショップ機能は、ユーザーがペットやアイテムを購入できる機能です。ペットは種類ごとに1個までしか購入できず、購入後は売り切れ状態になります。

## エンドポイント一覧

### パブリックエンドポイント

#### 1. ショップアイテム一覧取得
- **メソッド**: GET
- **エンドポイント**: `/api/shop/items`
- **クエリパラメータ**:
  - `category` (optional): ペットのカテゴリで絞り込み (例: "cat", "dog", "hamster", "special")
- **レスポンス例**:
```json
[
  {
    "item_id": "i00001",
    "item_name": "黒猫",
    "item_point": 500,
    "sold_count": 0,
    "item_image_folder": "images/cat/black",
    "item_create_day": "2025-06-06T00:00:00.000Z",
    "item_delete_day": "2026-06-06T00:00:00.000Z",
    "item_details": "可愛い黒猫です。基本的なペットとしてお手頃価格です。",
    "item_category": "pet",
    "pet_type": "cat",
    "pet_category": "pet"
  }
]
```

#### 2. ショップアイテム詳細取得
- **メソッド**: GET
- **エンドポイント**: `/api/shop/items/{item_id}`
- **レスポンス例**:
```json
[
  {
    "item_id": "i00001",
    "item_name": "黒猫",
    "item_point": 500,
    "sold_count": 0,
    "item_image_folder": "images/cat/black",
    "item_create_day": "2025-06-06T00:00:00.000Z",
    "item_delete_day": "2026-06-06T00:00:00.000Z",
    "item_details": "可愛い黒猫です。基本的なペットとしてお手頃価格です。",
    "item_category": "pet",
    "pet_type": "cat",
    "pet_category": "pet"
  }
]
```

#### 3. ペットカテゴリ一覧取得
- **メソッド**: GET
- **エンドポイント**: `/api/shop/categories`
- **レスポンス例**:
```json
{
  "success": true,
  "data": ["cat", "dog", "hamster", "special"]
}
```

### 認証が必要なエンドポイント

#### 4. アイテム購入
- **メソッド**: PUT
- **エンドポイント**: `/api/shop/purchase`
- **ヘッダー**: `Authorization: Bearer {token}`
- **リクエストボディ**:
```json
{
  "item_id": "i00001"
}
```
- **レスポンス例**:
```json
{
  "status": 200,
  "message": "販売数を更新しました",
  "data": {
    "item_id": "i00001",
    "item_image_folder": "images/cat/black"
  }
}
```

### 管理者用エンドポイント

#### 5. ショップアイテム登録
- **メソッド**: POST
- **エンドポイント**: `/api/admin/shop/items`
- **ヘッダー**: `Authorization: Bearer {admin_token}`
- **リクエストボディ**:
```json
{
  "item_id": "i00010",
  "item_name": "新しいペット",
  "item_point": 750,
  "item_image_folder": "images/pet/new",
  "item_create_day": "2025-08-05T00:00:00Z",
  "item_delete_day": "2026-08-05T00:00:00Z",
  "item_details": "新しく追加されたペットです。",
  "item_category": "pet",
  "pet_type": "cat"
}
```
- **レスポンス例**:
```json
{
  "status": 201,
  "message": "アイテムが登録されました",
  "data": {
    "item_id": "i00010",
    "item_name": "新しいペット",
    "item_point": 750,
    "sold_count": 0,
    "item_image_folder": "images/pet/new",
    "item_create_day": "2025-08-05T00:00:00.000Z",
    "item_delete_day": "2026-08-05T00:00:00.000Z",
    "item_details": "新しく追加されたペットです。",
    "item_category": "pet",
    "pet_type": "cat",
    "pet_category": "pet"
  }
}
```

#### 6. ショップアイテム削除
- **メソッド**: DELETE
- **エンドポイント**: `/api/admin/shop/{item_id}`
- **ヘッダー**: `Authorization: Bearer {admin_token}`
- **レスポンス例**:
```json
{
  "message": "アイテムを削除しました。"
}
```

## エラーレスポンス

### 400 Bad Request
```json
{
  "success": false,
  "message": "内容が見つかりません"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "ログインが必要です"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "内部サーバーエラーが発生しました"
}
```

## 特殊機能

### ペット購入制限
- ペットは各種類ごとに1個まで購入可能
- 既に購入済みのペットを再購入しようとすると「このペットは既に購入済みです」エラーが返される

### カテゴリ絞り込み
- `/api/shop/items?category=cat` でcat種類のペットのみ取得可能
- 利用可能なカテゴリは `/api/shop/categories` で確認可能

### ポイント管理
- アイテム購入時に自動的にユーザーポイントから差し引かれる
- ポイント不足の場合は「ポイントが不足しています」エラーが返される

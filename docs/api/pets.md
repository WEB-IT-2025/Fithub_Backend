# ペット管理API

## 概要
ペット機能に関するAPIエンドポイントの一覧です。ユーザーのペット情報の取得・更新、プロフィール情報の取得、管理者によるペット管理機能を提供します。

## ペットパラメータについて
各ペットには以下の3つのパラメータが自動計算されます：
- **健康度**: ユーザーの過去7日間の平均歩数に基づく (0-100) - メイン/サブ関係なく同じ値
- **サイズ**: 過去30日間のGitHubコントリビューション数に基づく (0-100) - メインペットは1.5倍のボーナス
- **親密度**: ペット購入からの日数と健康度・サイズの組み合わせで決まる (0-100) - メインペットは1.3倍、サブペットは0.8倍のボーナス

**重要**: ペットをメインペットに設定すると、サイズと親密度が向上します。健康度はユーザーの運動量に依存するため、ペットの種類に関係なく同じ値になります。

---

## エンドポイント一覧

### 1. ユーザープロフィール取得
ユーザーの基本情報、今週のコントリビューション、運動データ、メインペット情報を取得します。

**GET** `/api/pets/users/profile`

**認証**: 必要（完全ユーザー）

**レスポンス例**:
```json
{
  "user": {
    "user_name": "Nguyen Duc Huynh",
    "user_icon": "https://example.com/icon.jpg",
    "point": 5972
  },
  "weekly_contributions": [
    { "day": "2024-01-01", "count": "3" },
    { "day": "2024-01-02", "count": "5" }
  ],
  "exercise_data": {
    "today_steps": 5972,
    "weekly_steps": [
      { "date": "2024-01-01", "daily_steps": 8000 },
      { "date": "2024-01-02", "daily_steps": 6500 }
    ]
  },
  "main_pet": {
    "item_id": "pet001",
    "pet_name": "くろた",
    "pet_type": "cat",
    "user_pet_name": "くろた",
    "params": {
      "health": 85,
      "size": 60,
      "intimacy": 75
    }
  }
}
```

---

### 2. ペット一覧取得
ユーザーが所有するペット一覧を、パラメータ付きで取得します。

**GET** `/api/pets/users/pets`

**認証**: 必要（完全ユーザー）

**クエリパラメータ**:
- `category` (任意): ペットタイプによる絞り込み ("全て", "cat", "dog", "bird" など)
- `sort` (任意): ソート順 ("入手順", "親密度順", "健康度順")

**リクエスト例**:
```
GET /api/pets/users/pets?category=cat&sort=親密度順
```

**レスポンス例**:
```json
[
  {
    "item_id": "pet001",
    "pet_name": "くろた", 
    "pet_image_folder": "/images/pets/cat/",
    "pet_type": "cat",
    "user_pet_name": "くろた",
    "user_main_pet": true,
    "user_sub_pet": false,
    "pet_size": 60,
    "pet_states": 85,
    "purchase_time": "2024-01-01T00:00:00.000Z",
    "params": {
      "health": 85,
      "size": 60, 
      "intimacy": 75
    }
  }
]
```

---

### 3. メインペット更新
ユーザーのメインペットを設定・変更します。

**PUT** `/api/pets/users/pets/:pet_id/main`

**認証**: 必要（完全ユーザー）

**パラメータ**:
- `pet_id`: 対象ペットのitem_id

**リクエストボディ**:
```json
{
  "user_main_pet": true
}
```

**レスポンス例**:
```json
{
  "message": "主ペットを更新しました。",
  "pet": {
    "item_id": "pet001",
    "pet_name": "くろた",
    "pet_type": "cat",
    "user_pet_name": "くろた",
    "user_main_pet": true,
    "user_sub_pet": false,
    "pet_size": 60,
    "pet_states": 85,
    "purchase_time": "2024-01-01T00:00:00.000Z",
    "params": {
      "health": 85,
      "size": 90,
      "intimacy": 95
    }
  }
}
```

**注意**: メインペットに設定されたペットは、サイズと親密度にボーナスが適用されます。

---

### 4. サブペット更新
ユーザーのサブペットを設定・変更します。

**PUT** `/api/pets/users/pets/:pet_id/sub`

**認証**: 必要（完全ユーザー）

**パラメータ**:
- `pet_id`: 対象ペットのitem_id

**リクエストボディ**:
```json
{
  "user_sub_pet": true
}
```

**レスポンス例**:
```json
{
  "message": "サブペットを更新しました。",
  "pet": {
    "item_id": "pet002",
    "pet_name": "ポチ",
    "pet_type": "dog",
    "user_pet_name": "ポチ",
    "user_main_pet": false,
    "user_sub_pet": true,
    "pet_size": 60,
    "pet_states": 75,
    "purchase_time": "2024-01-05T00:00:00.000Z",
    "params": {
      "health": 85,
      "size": 60,
      "intimacy": 65
    }
  }
}
```

**注意**: サブペットは、メインペットと比べてサイズと親密度が控えめな値になります。

---

## 管理者機能（運営画面）

### 7. ペットサイズ基準更新（管理者）
ペットのサイズ計算に使用する基準値をTHRESHOLDテーブルで更新します。

**PUT** `/api/pets/admin/standards/pet_size`

**認証**: 必要（管理者）

**リクエストボディ**:
```json
{
  "pet_size": 40
}
```

**レスポンス例**:
```json
{
  "message": "ペットサイズの基準を更新しました。"
}
```

**エラーレスポンス**:
- `400 Bad Request`: リクエストが不正
- `404 Not Found`: ペットサイズが何も入ってません
- `500 Internal Server Error`: ペットサイズ情報更新エラー

---

### 8. ペット健康度基準更新（管理者）
ペットの健康度計算に使用する歩数基準値をTHRESHOLDテーブルで更新します。

**PUT** `/api/pets/admin/standards/pet_health`

**認証**: 必要（管理者）

**リクエストボディ**:
```json
{
  "pet_health": 4000
}
```

**レスポンス例**:
```json
{
  "message": "歩数ごとのペットの健康の基準を更新しました。"
}
```

**エラーレスポンス**:
- `400 Bad Request`: リクエストが不正
- `404 Not Found`: 歩数ごとのペットの健康が何も入ってません
- `500 Internal Server Error`: 歩数ごとのペットの健康情報更新エラー

---

## 管理者機能（ペット管理）

### 9. ペット登録（管理者）
新しいペットをシステムに登録します。

**POST** `/api/pets/admin/pets`

**認証**: 必要（管理者）

**リクエストボディ**:
```json
{
  "pet_id": "pet001",
  "pet_name": "くろた",
  "pet_image_folder": "/images/pets/cat/",
  "pet_type": "cat"
}
```

**レスポンス例**:
```json
{
  "message": "ペット情報を登録しました。"
}
```

---

### 10. ペット削除（管理者）
指定したペットをシステムから削除します。

**DELETE** `/api/pets/admin/pets/:pet_id`

**認証**: 必要（管理者）

**パラメータ**:
- `pet_id`: 削除対象ペットのitem_id

**レスポンス例**:
```json
{
  "message": "ペットを削除しました。"
}
```

---

## エラーレスポンス

**認証エラー (401)**:
```json
{
  "message": "認証情報が無効です"
}
```

**ペットが見つからない (404)**:
```json
{
  "message": "ペットが見つかりません"
}
```

**バリデーションエラー (400)**:
```json
{
  "message": "リクエストが不正です"
}
```

**サーバーエラー (500)**:
```json
{
  "message": "ユーザーペット情報取得エラー"
}
```

---

## データベース構造の変更点

### THRESHOLD テーブル
THRESHOLDテーブルを使用してペットのパラメータ計算基準を管理：
- `pet_size_logic`: ペットサイズ計算の基準値（デフォルト: 40）
- `pet_health_logic`: ペット健康度計算の歩数基準値（デフォルト: 100）
- `steps_point_settings`: 歩数ポイント設定
- `exercise_settings`: 運動設定

### パラメータ計算ロジックの更新
- **健康度**: `Math.min(100, Math.floor(avgSteps / pet_health_logic))`
- **サイズ**: `Math.min(100, Math.floor(totalContributions * (100 / pet_size_logic) * sizeMultiplier))`
- **親密度**: メイン/サブペットの違いを反映

### USERS_PETSテーブル
- `pet_id` → `item_id` に変更
- `pet_size` (INT): ペットのサイズ情報  
- `pet_states` (INT): ペットの状態情報

### PETSテーブル
- `pet_id` → `item_id` に変更（ITEMSテーブルのForeign Key）
- `pet_type` (VARCHAR): ペットの種類追加

### ITEMSテーブル
- ペット情報もアイテムとして管理
- `item_category = "pet"` でペットを識別

### 関連テーブル
- `EXERCISE_DATE`: 歩数データ（健康度計算に使用）
- `CONTRIBUTIONS`: GitHubコントリビューション（サイズ計算に使用）
- `PURCHASES`: 購入情報（親密度計算に使用）

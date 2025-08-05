# ミッションAPI仕様

## 概要
Fithubのミッション機能は、ユーザーの運動・GitHub活動などを目標として設定し、達成状況や報酬を管理します。  
全APIはJWT認証が必要です（管理系は管理者トークン必須）。

---

## エンドポイント一覧

### ミッション一覧取得
#### `GET /api/mission/list`
全ミッションの情報を取得します。

**レスポンス例**
```json
[
  {
    "mission_id": "m1",
    "mission_name": "歩け！",
    "mission_content": "1000歩",
    "reward_content": "100",
    "mission_type": "step",
    "mission_category": "daily"
  },
  ...
]
```

---

### ユーザーのミッション状況取得
#### `GET /api/mission/status?user_id=xxx`
認証ユーザーのミッション進捗・クリア状況を取得します。

**レスポンス例**
```json
[
  {
    "mission_id": "m1",
    "mission_goal": 1000,
    "current_status": 500,
    "clear_status": false,
    "clear_time": null,
    "reward_content": 100,
    "mission_type": "step",
    "mission_category": "daily"
  },
  ...
]
```

---

### ミッション詳細（typeで絞り込み）
#### `GET /api/mission/details?user_id=xxx&category=daily`
認証ユーザーのミッション詳細情報（categoryでdaily/weekly切替）。

**レスポンス例**
```json
[
  {
    "mission_id": "m1",
    "mission_name": "歩け！",
    "mission_content": "1000歩",
    "mission_reward": "100",
    "mission_category": "daily",
    "mission_goal": 1000,
    "current_status": 500,
    "clear_status": false,
    "progress_percentage": 50.0,
    "clear_time": null,
    "reward_content": 100,
    "mission_type": "step"
  },
  ...
]
```

---

### ミッションクリア状況確認
#### `GET /api/mission/check-status?user_id=xxx&mission_id=m1`
認証ユーザーの指定ミッションの進捗・クリア状況を取得。

**レスポンス例**
```json
{
  "isClear": false,
  "currentValue": 500,
  "targetValue": 1000,
  "missionType": "step"
}
```

---

### ミッション進捗チェック&自動クリア
#### `POST /api/mission/check-progress`
```json
{
  "user_id": "xxx",
  "mission_id": "m1"
}
```
**レスポンス例**
```json
{
  "message": "進捗を更新しました。",
  "data": {
    "isClear": false,
    "currentValue": 500,
    "targetValue": 1000
  }
}
```

---

### 全ミッション一括進捗チェック
#### `POST /api/mission/check-all-progress`
```json
{
  "user_id": "xxx"
}
```
**レスポンス例**
```json
{
  "message": "8個のミッションをチェックしました。",
  "checkedCount": 8,
  "newlyCleared": ["m1", "m3"],
  "newlyClearedCount": 2
}
```

---

### ミッションクリア
#### `POST /api/mission/clear`
```json
{
  "mission_id": "m1"
}
```
**レスポンス例**
```json
{
  "message": "ミッションをクリアし、ポイントを付与しました。"
}
```

---

### ミッション同期（進捗・リセット・クリア判定）
#### `POST /api/mission/sync`
認証ユーザーのミッション進捗を同期し、日次・週次リセットも自動実行。

**レスポンス例**
```json
{
  "message": "8件のミッションを同期しました。",
  "checkedCount": 8,
  "newlyCleared": ["m1", "m3"],
  "newlyClearedCount": 2
}


```

## 🎁 一括報酬受け取りAPI

### エンドポイント

`POST /api/mission/claim-all`

### 概要

クリア済みで、まだ報酬を受け取っていない全てのミッションに対して、報酬を一括で受け取ります。

---

### 🔐 認証

- JWTトークンが必要（`Authorization: Bearer <token>`）

---

### 📥 リクエスト

リクエストボディは不要です。

```http
POST /api/mission/claim-all
Authorization: Bearer <token>


---

### 管理者API

#### ミッション登録
`POST /api/mission/admin/mission_create`
```json
{
  "mission_id": "m9",
  "mission_name": "新しいミッション",
  "mission_content": "2000",
  "reward_content": "50",
  "mission_type": "step",
  "mission_category": "daily"
}
```

#### ミッション削除
`DELETE /api/mission/admin/mission_delete?mission_id=m9`

#### ミッションクリア取り消し
`PUT /api/mission/admin/revert`
```json
{
  "user_id": "user_xxx",
  "mission_id": "m1"
}
```

---

## 認証

- 全APIはJWTトークン必須
- 管理系APIは管理者トークン必須
- トークンは`Authorization: Bearer <session_token>`ヘッダーで送信

---

## エラーレスポンス例

```json
{
  "success": false,
  "message": "入力データが無効です",
  "errors": [
    {
      "type": "field",
      "msg": "mission_idは必須です",
      "path": "mission_id",
      "location": "body"
    }
  ]
}
```

---

## 運用ポイント

- 新規ユーザー登録時は全ミッションの進捗レコード（MISSION_CLEARD）が自動生成されます
- ミッション追加時は全ユーザーに進捗レコードが自動生成されます
- 進捗・クリア判定はGoogle Fit歩数やGitHubコントリビューションと連携
- 日次・週次リセットは自動実行（APIまたはCRON）

---

## 備考

- 進捗データが不整合の場合は管理者APIで修復
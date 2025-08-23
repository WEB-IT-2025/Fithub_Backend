# グループAPI

## 概要
Fithubのグループ機能では、ユーザーが運動仲間とグループを作成し、一緒に目標達成を目指すことができます。公開/非公開グループ、招待システム、メンバー管理、ペット統合表示などの機能を提供します。

## 認証について
すべてのグループAPIエンドポイントは認証が必要です。リクエストヘッダーにJWTトークンを含めてください：
```bash
Authorization: Bearer <your_jwt_token>
```

## エンドポイント

### 📋 グループ基本操作

#### `POST /api/group/create`

新しいグループを作成します。作成者は自動的にグループリーダーになります。

**リクエストボディ:**
```json
{
  "group_name": "朝活ランニング部",
  "max_person": 5,
  "back_image": "running_group.jpg",
  "group_public": true
}
```

**パラメータ:**
- `group_name` (必須): グループ名（1-50文字）
- `max_person` (必須): 最大参加人数（2-50人）
- `back_image` (オプション): 背景画像ファイル名（デフォルト: "default.jpg"）
- `group_public` (オプション): 公開グループかどうか（デフォルト: true）

**レスポンス:**
```json
{
  "message": "グループを作成しました。あなたがグループリーダーです。",
  "group_id": "group_12345",
  "role": "GROUP_LEADER"
}
```

#### `PUT /api/group/update`

グループ情報を更新します（グループリーダー限定）。

**リクエストボディ:**
```json
{
  "group_id": "group_12345",
  "group_name": "朝活ウォーキング部",
  "max_person": 8,
  "back_image": "walking_group.jpg"
}
```

**レスポンス:**
```json
{
  "message": "グループ情報を更新しました。"
}
```

#### `DELETE /api/group/delete`

グループを削除します（グループリーダー限定）。

**リクエストボディ:**
```json
{
  "group_id": "group_12345"
}
```

**レスポンス:**
```json
{
  "message": "グループを削除しました。"
}
```

#### `DELETE /api/group/admin-delete`

グループを強制削除します（システム管理者限定）。

**リクエストボディ:**
```json
{
  "group_id": "group_12345"
}
```

**レスポンス:**
```json
{
  "message": "システム管理者によりグループを削除しました。"
}
```

### 👥 メンバー管理

#### `GET /api/group/member/userlist`

自分が所属するグループ一覧を取得します（トークンベース認証）。

**リクエスト例:**
```bash
GET /api/group/member/userlist
Authorization: Bearer <your_jwt_token>
```

**レスポンス:**
```json
[
  {
    "group_id": "group_12345",
    "group_name": "朝活ランニング部",
    "max_person": 5,
    "current_count": 3,
    "back_image": "running_group.jpg",
    "is_leader": true,
    "role": "GROUP_LEADER"
  },
  {
    "group_id": "group_67890",
    "group_name": "夜ヨガサークル",
    "max_person": 10,
    "current_count": 7,
    "back_image": "yoga_group.jpg",
    "is_leader": false,
    "role": "MEMBER"
  }
]
```

#### `GET /api/group/members/list/:group_id`

グループメンバー一覧をメインペット情報と共に取得します。

**リクエスト例:**
```bash
GET /api/group/members/list/group_12345
```

**レスポンス:**
```json
[
  {
    "user_id": "user_123",
    "user_name": "田中太郎",
    "user_icon": "https://example.com/icon1.jpg",
    "is_leader": true,
    "role": "GROUP_LEADER",
    "main_pet": {
      "pet_name": "ポチ",
      "item_id": "pet_001",
      "pet_size": 3,
      "pet_intimacy": 85,
      "pet_image": "https://example.com/pets/dog_happy.png"
    }
  },
  {
    "user_id": "user_456",
    "user_name": "佐藤花子",
    "user_icon": "https://example.com/icon2.jpg",
    "is_leader": false,
    "role": "MEMBER",
    "main_pet": {
      "pet_name": "ミケ",
      "item_id": "pet_002",
      "pet_size": 2,
      "pet_intimacy": 72,
      "pet_image": "https://example.com/pets/cat_cute.png"
    }
  },
  {
    "user_id": "user_789",
    "user_name": "鈴木一郎",
    "user_icon": "https://example.com/icon3.jpg",
    "is_leader": false,
    "role": "MEMBER",
    "main_pet": null
  }
]
```

#### `POST /api/group/members/join`

公開グループに自己参加します。

**リクエストボディ:**
```json
{
  "group_id": "group_12345"
}
```

**レスポンス:**
```json
{
  "message": "朝活ランニング部に参加しました"
}
```

#### `POST /api/group/members/invite`

メンバーを直接招待します（グループリーダー限定）。

**リクエストボディ:**
```json
{
  "group_id": "group_12345",
  "user_id": "user_456"
}
```

**レスポンス:**
```json
{
  "message": "佐藤花子を朝活ランニング部に招待しました",
  "group_id": "group_12345",
  "group_name": "朝活ランニング部",
  "invited_user": {
    "user_id": "user_456",
    "user_name": "佐藤花子"
  }
}
```

#### `DELETE /api/group/members/remove`

メンバーを削除します（グループリーダー限定）。

**リクエストボディ:**
```json
{
  "group_id": "group_12345",
  "user_id": "user_456"
}
```

**レスポンス:**
```json
{
  "message": "佐藤花子をグループから削除しました",
  "group_id": "group_12345",
  "removed_user": {
    "user_id": "user_456",
    "user_name": "佐藤花子"
  }
}
```

#### `DELETE /api/group/members/leave/:group_id`

グループから自己退会します（一般メンバーのみ）。

**リクエスト例:**
```bash
DELETE /api/group/members/leave/group_12345
Authorization: Bearer <your_jwt_token>
```

**レスポンス:**
```json
{
  "message": "朝活ランニング部から退会しました",
  "group_id": "group_12345",
  "group_name": "朝活ランニング部"
}
```

### 🔍 グループ検索

#### `GET /api/group/search`

公開グループを検索します。

**クエリパラメータ:**
- `search` (オプション): 検索キーワード
- `limit` (オプション): 取得件数（デフォルト: 20）

**リクエスト例:**
```bash
GET /api/group/search?search=ランニング&limit=10
```

**レスポンス:**
```json
[
  {
    "group_id": "group_12345",
    "group_name": "朝活ランニング部",
    "max_person": 5,
    "back_image": "running_group.jpg",
    "current_count": 3,
    "is_full": false
  },
  {
    "group_id": "group_98765",
    "group_name": "夜ランニングクラブ",
    "max_person": 8,
    "back_image": "night_running.jpg",
    "current_count": 8,
    "is_full": true
  }
]
```

### 🎫 招待コードシステム

#### `POST /api/group/invite-code/generate`

招待コードを生成します（グループリーダー限定）。

**リクエストボディ:**
```json
{
  "group_id": "group_12345"
}
```

**レスポンス:**
```json
{
  "message": "招待コードを生成しました",
  "invite_code": "ABC123XY",
  "group_id": "group_12345",
  "group_name": "朝活ランニング部"
}
```

#### `POST /api/group/invite-code/join`

招待コードを使用してグループに参加します。

**リクエストボディ:**
```json
{
  "invite_code": "ABC123XY"
}
```

**レスポンス:**
```json
{
  "message": "招待コードで朝活ランニング部に参加しました",
  "group_id": "group_12345",
  "group_name": "朝活ランニング部"
}
```

## ❌ エラーレスポンス

### バリデーションエラー
```json
{
  "error": "バリデーションエラー",
  "details": [
    {
      "field": "group_name",
      "message": "グループ名は1文字以上50文字以下で入力してください"
    }
  ]
}
```

### 権限エラー
```json
{
  "error": "グループリーダーのみがこの操作を実行できます。"
}
```

### グループ満員エラー
```json
{
  "error": "グループの定員に達しています。"
}
```

### グループ未発見エラー
```json
{
  "error": "グループが見つかりません。"
}
```

### 重複参加エラー
```json
{
  "error": "既にグループのメンバーです。"
}
```

### プライベートグループエラー
```json
{
  "error": "プライベートグループには招待が必要です。"
}
```

### 無効招待コードエラー
```json
{
  "error": "無効な招待コードです。"
}
```

### 自己削除エラー
```json
{
  "error": "グループリーダーは自分自身を削除できません。グループを削除してください。"
}
```

### 自己退会エラー（リーダー）
```json
{
  "error": "グループリーダーは退会できません。グループを削除するか、他のメンバーにリーダーを譲渡してください。"
}
```

### 非メンバーエラー
```json
{
  "error": "あなたはこのグループのメンバーではありません。"
}
```

## 🔐 権限システム

### グループリーダー権限
- グループ情報の更新
- グループの削除
- メンバーの招待・削除
- 招待コードの生成

### 一般メンバー権限
- グループ情報の閲覧
- 自己退会
- グループへの参加（公開グループ）
- 招待コードでの参加

### システム管理者権限
- すべてのグループの強制削除
- グループ統計の閲覧

## 💡 統合のヒント

### フロントエンド統合例

#### グループ作成
```javascript
const createGroup = async (groupData) => {
  const response = await fetch('/api/group/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(groupData)
  });
  
  const result = await response.json();
  if (response.ok) {
    console.log('グループ作成成功:', result);
  } else {
    console.error('エラー:', result.error);
  }
};
```

#### 招待コード機能
```javascript
// 招待コード生成
const generateInviteCode = async (groupId) => {
  const response = await fetch('/api/group/invite-code/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ group_id: groupId })
  });
  
  const result = await response.json();
  return result.invite_code;
};

// 招待コードで参加
const joinByCode = async (inviteCode) => {
  const response = await fetch('/api/group/invite-code/join', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ invite_code: inviteCode })
  });
  
  return await response.json();
};
```

#### グループメンバー表示（ペット統合）
```javascript
const displayGroupMembers = async (groupId) => {
  const response = await fetch(`/api/group/members/list/${groupId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  const members = await response.json();
  
  members.forEach(member => {
    console.log(`${member.user_name} (${member.role})`);
    if (member.main_pet) {
      console.log(`  ペット: ${member.main_pet.pet_name} (親密度: ${member.main_pet.pet_intimacy})`);
      console.log(`  画像: ${member.main_pet.pet_image}`);
    } else {
      console.log('  ペット: なし');
    }
  });
};

// 自分のグループ一覧取得
const getMyGroups = async () => {
  const response = await fetch('/api/group/member/userlist', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  const groups = await response.json();
  return groups;
};

// グループから退会
const leaveGroup = async (groupId) => {
  const response = await fetch(`/api/group/members/leave/${groupId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  const result = await response.json();
  if (response.ok) {
    console.log('退会成功:', result.message);
  } else {
    console.error('エラー:', result.error);
  }
};
```

### モバイル統合
```javascript
// React Native例
const GroupScreen = () => {
  const [groups, setGroups] = useState([]);
  
  useEffect(() => {
    loadUserGroups();
  }, []);
  
  const loadUserGroups = async () => {
    const token = await AsyncStorage.getItem('token');
    
    const response = await fetch('/api/group/member/userlist', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const userGroups = await response.json();
    setGroups(userGroups);
  };
  
  return (
    <FlatList
      data={groups}
      renderItem={({ item }) => (
        <GroupCard 
          group={item}
          isLeader={item.is_leader}
        />
      )}
    />
  );
};
```

## 🌊 グループ作成・参加フロー図

```
ユーザー A (リーダー)    バックエンド        ユーザー B (参加者)
    |                       |                      |
    |-- POST /group/create --|                      |
    |<-- グループ作成完了 ----|                      |
    |                       |                      |
    |-- POST /invite-code/generate --|               |
    |<-- 招待コード返却 -----|                      |
    |                       |                      |
    |-- 招待コード共有 ------|------- LINE/メール ---|
    |                       |                      |
    |                       |<-- POST /invite-code/join --|
    |                       |-- メンバー追加 ------>|
    |                       |-- 参加通知 ---------->|
    |<-- 新メンバー通知 -----|                      |
```

## 📱 UI/UXのベストプラクティス

### グループ一覧表示
- 満員グループは「満員」バッジを表示
- リーダーグループには「👑」アイコン
- 背景画像でグループの特色を表現

### メンバー表示
- ペット情報を統合してユーザーの個性を表現
- リーダーバッジでロールを明確化
- ペットタップでプロフィール詳細表示

### 招待システム
- QRコード生成で簡単共有
- 招待リンクの期限設定（将来実装予定）
- 招待履歴の追跡（将来実装予定）

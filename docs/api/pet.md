# Pet API Documentation

## Overview
ペット関連のAPIエンドポイント

## Endpoints

### `GET /api/pet/name`
ユーザー名のみを取得

**認証**: 必要（JWT Token）

**リクエスト例:**
```javascript
// JavaScript/React Native
const response = await fetch('/api/pet/name', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
```

**cURLリクエスト例:**
```bash
curl -X GET http://localhost:3000/api/pet/name \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "user_id": "7Mpj4mM1qS9vX2nE8fR3",
    "user_name": "田中太郎"
  }
}
```

**エラーレスポンス:**
```json
{
  "success": false,
  "error": "認証が必要です"
}
```

---

### `GET /api/pet/profile`
ユーザープロフィール取得（メインペット情報込み）

**認証**: 必要（JWT Token）

**リクエスト例:**
```javascript
// JavaScript/React Native
const response = await fetch('/api/pet/profile', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
```

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "user_id": "7Mpj4mM1qS9vX2nE8fR3",
    "user_name": "田中太郎",
    "user_icon": "user_icon_url.jpg",
    "main_pet_item_id": "pet_001",
    "main_pet_name": "かわいい猫",
    "main_pet_user_name": "ミケ",
    "main_pet_image_url": "pet_image_url.jpg",
    "main_pet_type": "cat",
    "main_pet_size": 75,
    "main_pet_intimacy": 85
  }
}
```

---

### `GET /api/pet/owned`
所有しているペット一覧取得

**認証**: 必要（JWT Token）

**リクエスト例:**
```javascript
const response = await fetch('/api/pet/owned', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
});
```

**レスポンス例:**
```json
{
  "success": true,
  "data": [
    {
      "item_id": "pet_001",
      "item_name": "かわいい猫",
      "item_image_url": "cat_image.jpg",
      "pet_type": "cat",
      "user_main_pet": true,
      "user_pet_name": "ミケ",
      "pet_size": 75,
      "pet_intimacy": 85
    },
    {
      "item_id": "pet_002",
      "item_name": "元気な犬",
      "item_image_url": "dog_image.jpg",
      "pet_type": "dog",
      "user_main_pet": false,
      "user_pet_name": "ポチ",
      "pet_size": 60,
      "pet_intimacy": 70
    }
  ]
}
```

---

## 使用例

### React Nativeでユーザー名表示
```javascript
const ProfileName = () => {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        const response = await fetch('http://localhost:3000/api/pet/name', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        if (result.success) {
          setUserName(result.data.user_name);
        }
      } catch (error) {
        console.error('ユーザー名取得エラー:', error);
      }
    };

    fetchUserName();
  }, []);

  return (
    <View>
      <Text>こんにちは、{userName}さん！</Text>
    </View>
  );
};
```

### ユーザー名とプロフィール表示の使い分け

- **軽量表示（ヘッダーなど）**: `/api/pet/name` - ユーザー名のみ
- **詳細プロフィール**: `/api/pet/profile` - ペット情報込み完全プロフィール
- **ペット管理画面**: `/api/pet/owned` - 所有ペット一覧

この設計により、必要最小限のデータのみを効率的に取得できます。

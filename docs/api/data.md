# データAPI

## 概要
データAPIは、ユーザーのフィットネスデータ（Google Fit歩数）とGitHubコントリビューションの取得・同期を可能にします。すべてのエンドポイントはJWT認証が必要です。

## 認証必須
```
Authorization: Bearer <your_jwt_token>
```

## エンドポイント

### 📊 ユーザーデータ取得

#### `GET /api/data/user`

今日のデータと過去7日間を含むユーザーの詳細データを取得します。

**ヘッダー:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "user_id": "google_123456789",
    "today": {
      "date": "2025-07-07",
      "steps": 8543,
      "contributions": 3
    },
    "recent_exercise": [
      {
        "day": "2025-07-07T00:00:00.000Z",
        "exercise_quantity": 8543
      },
      {
        "day": "2025-07-06T00:00:00.000Z", 
        "exercise_quantity": 12000
      },
      {
        "day": "2025-07-05T00:00:00.000Z",
        "exercise_quantity": 7200
      }
    ],
    "recent_contributions": [
      {
        "day": "2025-07-07T00:00:00.000Z",
        "count": "3"
      },
      {
        "day": "2025-07-06T00:00:00.000Z",
        "count": "5"
      },
      {
        "day": "2025-07-05T00:00:00.000Z", 
        "count": "2"
      }
    ],
    "last_updated": "2025-07-07T10:30:45.123Z"
  }
}
```

### 📈 ユーザー統計取得

#### `GET /api/data/stats`

週間・月間のユーザー統計サマリーを取得します。

**ヘッダー:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "user_id": "google_123456789",
    "weekly": {
      "total_steps": 65432,
      "total_contributions": 18,
      "active_days": 6
    },
    "monthly": {
      "total_steps": 234567,
      "total_contributions": 72,
      "active_days": 28
    },
    "last_updated": "2025-07-07T10:30:45.123Z"
  }
}
```

**統計の説明:**
- `total_steps`: 期間内の総歩数
- `total_contributions`: GitHubコントリビューション総数
- `active_days`: アクティブな日数（最低1歩記録のある日）

### 🔄 手動データ同期

#### `POST /api/data/sync`

Google FitとGitHubから即座にデータを手動同期します。

**ヘッダー:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**リクエストボディ:** (空)

**レスポンス:**
```json
{
  "success": true,
  "message": "Data synced successfully",
  "data": {
    "user_id": "google_123456789",
    "synced_at": "2025-07-07T10:30:45.123Z",
    "exercise_data": {
      "date": "2025-07-07",
      "steps": 8543,
      "source": "google_fit",
      "status": "updated"
    },
    "contribution_data": {
      "date": "2025-07-07", 
      "contributions": 3,
      "source": "github_api",
      "status": "updated"
    }
  }
}
```

## 📊 データソース

### Google Fit統合
- **ソース**: Google Fit API
- **データタイプ**: 日次歩数
- **同期頻度**: 15分毎（自動）+ 手動同期
- **履歴データ**: 最大1年（Google Fitの設定による）

### GitHub統合  
- **ソース**: GitHub GraphQL API
- **データタイプ**: 日次コントリビューション数
- **同期頻度**: 15分毎（自動）+ 手動同期
- **履歴データ**: 現在年のコントリビューション

## 🔄 自動同期の動作

### 自動同期
- **頻度**: 15分毎
- **対象**: システム内の全ユーザー
- **バックグラウンド処理**: Cronジョブサービス
- **リトライロジック**: 指数バックオフで3回試行

### データ鮮度
- **リアルタイム**: 手動同期で即座更新
- **準リアルタイム**: 15分毎の自動同期
- **履歴**: 当日以前のデータは通常安定

## ❌ エラーレスポンス

### 認証エラー
```json
{
  "success": false,
  "message": "User not authenticated"
}
```

### データ同期エラー
```json
{
  "success": false,
  "message": "Failed to sync user data",
  "error": "Google Fit API rate limit exceeded"
}
```

### トークン期限切れエラー
```json
{
  "success": false,
  "message": "Google OAuth token expired. Please re-authenticate."
}
```

### ネットワークエラー
```json
{
  "success": false,
  "message": "Failed to retrieve user data",
  "error": "Database connection timeout"
}
```

## 💡 使用例

### フロントエンド統合例

```javascript
class FithubDataService {
  constructor(token) {
    this.token = token;
    this.baseURL = 'http://localhost:3000/api/data';
  }

  async getUserData() {
    const response = await fetch(`${this.baseURL}/user`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('ユーザーデータの取得に失敗しました');
    }
    
    return await response.json();
  }

  async getUserStats() {
    const response = await fetch(`${this.baseURL}/stats`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return await response.json();
  }

  async syncData() {
    const response = await fetch(`${this.baseURL}/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return await response.json();
  }
}

// 使用方法
const dataService = new FithubDataService(userToken);

// ダッシュボードデータ読み込み
async function loadDashboard() {
  try {
    const [userData, userStats] = await Promise.all([
      dataService.getUserData(),
      dataService.getUserStats()
    ]);

    updateUI(userData.data, userStats.data);
  } catch (error) {
    console.error('ダッシュボード読み込み失敗:', error);
  }
}

// 手動同期ボタン
async function handleManualSync() {
  try {
    setLoading(true);
    const result = await dataService.syncData();
    
    if (result.success) {
      showNotification('データ同期が完了しました！');
      await loadDashboard(); // データを再読み込み
    }
  } catch (error) {
    showNotification('同期に失敗しました。再試行してください。');
  } finally {
    setLoading(false);
  }
}
```

### モバイルアプリ統合

```javascript
// React Native例
import AsyncStorage from '@react-native-async-storage/async-storage';

class MobileFithubService {
  async getUserData() {
    const token = await AsyncStorage.getItem('fithub_token');
    
    const response = await fetch('http://localhost:3000/api/data/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      // トークン期限切れ、ログインにリダイレクト
      await AsyncStorage.removeItem('fithub_token');
      NavigationService.navigate('Login');
      return;
    }

    return await response.json();
  }

  async syncWithRetry(maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await this.syncData();
        return result;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
}
```

## 📱 データ可視化のヒント

### チャート統合
```javascript
// チャート用データフォーマット
function formatChartData(userData) {
  const exerciseData = userData.recent_exercise.map(item => ({
    date: new Date(item.day).toLocaleDateString('ja-JP'),
    steps: item.exercise_quantity
  }));

  const contributionData = userData.recent_contributions.map(item => ({
    date: new Date(item.day).toLocaleDateString('ja-JP'), 
    contributions: parseInt(item.count)
  }));

  return { exerciseData, contributionData };
}

// 週間進捗計算
function calculateWeeklyProgress(currentWeek, previousWeek) {
  const stepProgress = ((currentWeek.total_steps - previousWeek.total_steps) / previousWeek.total_steps) * 100;
  const contributionProgress = ((currentWeek.total_contributions - previousWeek.total_contributions) / previousWeek.total_contributions) * 100;
  
  return { stepProgress, contributionProgress };
}
```

## 🔧 パフォーマンス考慮事項

### キャッシュ戦略
- フロントエンドは5-10分間データをキャッシュ
- ユーザーが明示的に要求した時のみ手動同期を使用
- モバイルアプリのオフラインモード実装を検討

### レート制限
- 手動同期は1ユーザーあたり1分に1回に制限
- 自動同期がすべてのバックグラウンド更新を処理
- フロントエンドからの積極的なポーリングは不要

### データ読み込み
- ユーザーデータと統計を並行読み込み
- より良いUXのためのローディング状態を使用
- 失敗したリクエストのためのエラーバウンダリーを実装

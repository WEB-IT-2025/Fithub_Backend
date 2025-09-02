# データAPI

## 概要
データAPIは、ユーザーのフィットネスデータ（Google Fit歩数）とGitHubコントリビューションの取得・同期を可能にします。また、日中の詳細な歩数推移を2時間毎に追跡する機能も提供します。

## API分類

### パブリックAPI（認証不要）
- **ユーザーID必須**: URLパラメータでuser_idを指定
- **用途**: フロントエンドの公開表示、埋め込み表示
- **制限**: user_idを知っている場合のみアクセス可能

### 認証必須API
- **JWT認証**: `Authorization: Bearer <your_jwt_token>`
- **用途**: データ同期、管理機能

## エンドポイント

## 📊 パブリック データ取得API

### 🎯 ユーザー コントリビューション取得

#### `GET /api/data/contribution/:userId`

**認証**: 不要  
**説明**: ユーザーのGitHubコントリビューション形式のデータ（30日間）と週間・月間の合計を取得

**URLパラメータ:**
- `userId` (string): 対象ユーザーのID

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "user_id": "user_1752561583127_xengpxnh1",
    "recent_contributions": [
      {
        "day": "2025-08-24T00:00:00.000Z",
        "count": "5"
      },
      {
        "day": "2025-08-23T00:00:00.000Z",
        "count": "3"
      },
      {
        "day": "2025-08-22T00:00:00.000Z",
        "count": "8"
      }
    ],
    "weekly_total": 18,
    "monthly_total": 67,
    "last_updated": "2025-08-24T10:30:45.123Z"
  }
}
```

### � ユーザー 週間データ取得

#### `GET /api/data/weekly/:userId`

**認証**: 不要  
**説明**: ユーザーの過去7日間の歩数データと合計を取得

**URLパラメータ:**
- `userId` (string): 対象ユーザーのID

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "user_id": "user_1752561583127_xengpxnh1",
    "recent_exercise": [
      {
        "day": "2025-08-24T00:00:00.000Z",
        "exercise_quantity": 8543
      },
      {
        "day": "2025-08-23T00:00:00.000Z",
        "exercise_quantity": 12000
      },
      {
        "day": "2025-08-22T00:00:00.000Z",
        "exercise_quantity": 7200
      }
    ],
    "total_steps": 52743,
    "period": "7 days",
    "last_updated": "2025-08-24T10:30:45.123Z"
  }
}
```

### � ユーザー 月間データ取得

#### `GET /api/data/monthly/:userId`

**認証**: 不要  
**説明**: ユーザーの過去30日間の歩数データと合計を取得

**URLパラメータ:**
- `userId` (string): 対象ユーザーのID

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "user_id": "user_1752561583127_xengpxnh1", 
    "recent_exercise": [
      {
        "day": "2025-08-24T00:00:00.000Z",
        "exercise_quantity": 8543
      },
      {
        "day": "2025-08-23T00:00:00.000Z", 
        "exercise_quantity": 12000
      }
    ],
    "total_steps": 234567,
    "period": "30 days",
    "last_updated": "2025-08-24T10:30:45.123Z"
  }
}
```

### � GitHub ユーザー名取得

#### `GET /api/data/githubUserName/:userId`

**認証**: 不要  
**説明**: 指定されたユーザーのGitHubユーザー名とGitHub IDを取得

**URLパラメータ:**
- `userId` (string): 対象ユーザーのID

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "user_id": "user_1752561583127_xengpxnh1",
    "github_username": "keyi1000",
    "github_user_id": "169336440"
  }
}
```

**エラーレスポンス:**
```json
{
  "success": false,
  "message": "User not found"
}
```

または

```json
{
  "success": false,
  "message": "GitHub username not found for this user"
}
```

### �📈 時間別歩数データ取得

#### `GET /api/data/hourly/:userId`

**認証**: 不要  
**説明**: 今日の2時間毎の累積歩数データを取得。Google Fitスタイルの累積グラフ表示に最適

**URLパラメータ:**
- `userId` (string): 対象ユーザーのID

**データ形式の説明:**
- **インターバルデータ**: 各時間の`steps`はその2時間間隔での**歩数増分**
- **累積データ**: `totalSteps`は00:00からその時間までの**累積歩数**
- **2時間間隔**: 00:00, 02:00, 04:00, ..., 22:00（最大12個のデータポイント）
- **JST timezone**: すべてのタイムスタンプは日本標準時
- **未来データ防止**: 現在時刻より後のデータは返されません

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "user_id": "user_1752561583127_xengpxnh1",
    "date": "2025-08-24",
    "hourly_data": [
      {
        "time": "00:00",
        "timeValue": 0,
        "steps": 0,
        "totalSteps": 0,
        "timestamp": "2025-08-24 00:00:00"
      },
      {
        "time": "02:00",
        "timeValue": 2,
        "steps": 0,
        "totalSteps": 0,
        "timestamp": "2025-08-24 02:00:00"
      },
      {
        "time": "04:00",
        "timeValue": 4,
        "steps": 5,
        "totalSteps": 5,
        "timestamp": "2025-08-24 04:00:00"
      },
      {
        "time": "06:00",
        "timeValue": 6,
        "steps": 5,
        "totalSteps": 10,
        "timestamp": "2025-08-24 06:00:00"
      },
      {
        "time": "08:00",
        "timeValue": 8,
        "steps": 6,
        "totalSteps": 16,
        "timestamp": "2025-08-24 08:00:00"
      },
      {
        "time": "10:00",
        "timeValue": 10,
        "steps": 14,
        "totalSteps": 30,
        "timestamp": "2025-08-24 10:00:00"
      },
      {
        "time": "12:00",
        "timeValue": 12,
        "steps": 7,
        "totalSteps": 37,
        "timestamp": "2025-08-24 12:00:00"
      }
    ],
    "total_steps": 37,
    "data_points": 7,
    "time_range": "2-hour intervals: 00:00, 02:00, 04:00, 06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00",
    "last_updated": "2025-08-24T04:35:57.719Z"
  }
}
```

**フィールド説明:**
- `steps`: その2時間間隔での**歩数増分**（例: 08:00の6は06:00-07:59の歩数）
- `totalSteps`: 00:00からその時間までの**累積歩数**（例: 08:00の16は00:00-07:59の合計）
- `time`: 表示用時間（"08:00"形式）
- `timeValue`: チャートライブラリ用数値（8）
- `timestamp`: 完全なタイムスタンプ（JST）
- `data_points`: 実際に返されるデータポイント数（未来データ除外後）

**チャート表示のヒント:**
```javascript
// 累積歩数グラフ（Google Fitスタイル）
const cumulativeChart = hourlyData.map(d => ({
  x: d.timeValue,
  y: d.totalSteps // 累積値を使用
}))

// インターバル歩数グラフ（各時間帯の活動量）
const intervalChart = hourlyData.map(d => ({
  x: d.timeValue,
  y: d.steps // インターバル値を使用
}))

// 両方のデータを同時に表示
const combinedChart = {
  datasets: [
    {
      label: '累積歩数',
      data: hourlyData.map(d => ({ x: d.timeValue, y: d.totalSteps })),
      type: 'line'
    },
    {
      label: '時間別歩数',
      data: hourlyData.map(d => ({ x: d.timeValue, y: d.steps })),
      type: 'bar'
    }
  ]
}
```

## 🔐 認証必須API

### 🔄 手動データ同期

#### `POST /api/data/sync`

**認証**: 必要  
**説明**: Google FitとGitHubから即座にデータを手動同期

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
  "message": "Data synced successfully (including hourly data)",
  "data": {
    "user_id": "google_123456789",
    "synced_at": "2025-08-24T10:30:45.123Z",
    "exercise_data": {
      "date": "2025-08-24",
      "steps": 8543,
      "source": "google_fit",
      "status": "updated"
    },
    "contribution_data": {
      "date": "2025-08-24", 
      "contributions": 3,
      "source": "github_api",
      "status": "updated"
    },
    "hourly_data": {
      "entries": 8,
      "data": [...]
    }
  }
}
```

## 📊 データソース

### Google Fit統合
- **ソース**: Google Fit API
- **データタイプ**: 日次歩数 + 2時間毎の詳細歩数
- **同期頻度**: 
  - 日次データ: 15分毎（自動）+ 手動同期
  - 時間別データ: 2時間毎（自動）+ 手動同期
- **履歴データ**: 最大1年（Google Fitの設定による）
- **データ保持**: 
  - 日次データ: EXERCISE テーブルに永続保存
  - 時間別データ: EXERCISE_DATE テーブルに当日のみ保持（翌日自動削除）

### GitHub統合  
- **ソース**: GitHub GraphQL API
- **データタイプ**: 日次コントリビューション数
- **同期頻度**: 15分毎（自動）+ 手動同期
- **履歴データ**: 現在年のコントリビューション

## 🔄 自動同期の動作

### 自動同期
- **日次データ同期**: 15分毎（全ユーザー）
- **時間別データ同期**: 2時間毎（Googleアクセストークンを持つユーザー）
- **データクリーンアップ**: 毎日深夜0:01に前日の時間別データを削除
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

### フロントエンド統合例（パブリックAPI）

```javascript
class FithubDataService {
  constructor() {
    this.baseURL = 'http://localhost:3000/api/data';
  }

  // パブリックAPI（認証不要）
  async getUserContributions(userId) {
    const response = await fetch(`${this.baseURL}/contribution/${userId}`);
    
    if (!response.ok) {
      throw new Error('コントリビューションデータの取得に失敗しました');
    }
    
    return await response.json();
  }

  async getUserWeeklyData(userId) {
    const response = await fetch(`${this.baseURL}/weekly/${userId}`);
    
    if (!response.ok) {
      throw new Error('週間データの取得に失敗しました');
    }
    
    return await response.json();
  }

  async getUserMonthlyData(userId) {
    const response = await fetch(`${this.baseURL}/monthly/${userId}`);
    
    if (!response.ok) {
      throw new Error('月間データの取得に失敗しました');
    }
    
    return await response.json();
  }

  async getUserHourlyData(userId) {
    const response = await fetch(`${this.baseURL}/hourly/${userId}`);
    
    if (!response.ok) {
      throw new Error('時間別データの取得に失敗しました');  
    }
    
    return await response.json();
  }

  // 認証が必要なAPI
  async syncData(token) {
    const response = await fetch(`${this.baseURL}/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return await response.json();
  }
}

// 使用方法（パブリック表示）
const dataService = new FithubDataService();

// ユーザープロフィール表示
async function loadUserProfile(userId) {
  try {
    const [contributions, weeklyData, monthlyData, hourlyData] = await Promise.all([
      dataService.getUserContributions(userId),
      dataService.getUserWeeklyData(userId),
      dataService.getUserMonthlyData(userId),
      dataService.getUserHourlyData(userId)
    ]);

    updateProfileUI({
      contributions: contributions.data,
      weekly: weeklyData.data,
      monthly: monthlyData.data,
      hourly: hourlyData.data
    });
  } catch (error) {
    console.error('プロフィール読み込み失敗:', error);
  }
}

// チャート表示用
function createStepsChart(hourlyData) {
  return {
    labels: hourlyData.hourly_data.map(d => d.time),
    datasets: [{
      label: '累積歩数',
      data: hourlyData.hourly_data.map(d => d.totalSteps),
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }, {
      label: '2時間毎歩数',
      data: hourlyData.hourly_data.map(d => d.steps),
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      type: 'bar'
    }]
  };
}

// GitHub風コントリビューション表示
function createContributionGrid(contributionData) {
  const grid = contributionData.recent_contributions.map(day => ({
    date: new Date(day.day).toISOString().split('T')[0],
    count: parseInt(day.count),
    level: getContributionLevel(parseInt(day.count)) // 0-4のレベル
  }));
  
  return grid;
}

function getContributionLevel(count) {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;  
  if (count <= 8) return 3;
  return 4;
}
```

### React コンポーネント例

```jsx
import React, { useState, useEffect } from 'react';

const UserProfile = ({ userId }) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const dataService = new FithubDataService();
      
      const [contributions, weekly, monthly, hourly] = await Promise.all([
        dataService.getUserContributions(userId),
        dataService.getUserWeeklyData(userId),
        dataService.getUserMonthlyData(userId),
        dataService.getUserHourlyData(userId)
      ]);

      setProfileData({
        contributions: contributions.data,
        weekly: weekly.data,
        monthly: monthly.data,
        hourly: hourly.data
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error}</div>;
  if (!profileData) return <div>データが見つかりません</div>;

  return (
    <div className="user-profile">
      <h2>ユーザー: {userId}</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>今週</h3>
          <p>{profileData.weekly.total_steps.toLocaleString()} 歩</p>
        </div>
        <div className="stat-card">
          <h3>今月</h3>
          <p>{profileData.monthly.total_steps.toLocaleString()} 歩</p>
        </div>
        <div className="stat-card">
          <h3>週間コントリビューション</h3>
          <p>{profileData.contributions.weekly_total} 回</p>
        </div>
        <div className="stat-card">
          <h3>月間コントリビューション</h3>
          <p>{profileData.contributions.monthly_total} 回</p>
        </div>
      </div>
      
      <div className="charts">
        <div className="chart-section">
          <h3>今日の歩数推移</h3>
          <HourlyStepsChart data={profileData.hourly} />
        </div>
        
        <div className="chart-section">
          <h3>週間歩数</h3>
          <WeeklyStepsChart data={profileData.weekly} />
        </div>
        
        <div className="chart-section">
          <h3>コントリビューション</h3>
          <ContributionGrid data={profileData.contributions} />
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
```

## 📱 データ可視化のヒント

### チャート統合
```javascript
// 時間別歩数チャート用データフォーマット
function formatHourlyChartData(hourlyData) {
  return {
    labels: hourlyData.hourly_data.map(d => d.time),
    cumulativeData: hourlyData.hourly_data.map(d => d.totalSteps),
    intervalData: hourlyData.hourly_data.map(d => d.steps)
  };
}

// 週間/月間チャート用データフォーマット  
function formatPeriodChartData(exerciseData) {
  return exerciseData.recent_exercise.map(item => ({
    date: new Date(item.day).toLocaleDateString('ja-JP'),
    steps: item.exercise_quantity
  }));
}

// コントリビューション表示用データフォーマット
function formatContributionData(contributionData) {
  return contributionData.recent_contributions.map(item => ({
    date: new Date(item.day).toLocaleDateString('ja-JP'), 
    contributions: parseInt(item.count),
    level: getContributionLevel(parseInt(item.count))
  }));
}

// GitHub風コントリビューションレベル計算
function getContributionLevel(count) {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;  
  if (count <= 8) return 3;
  return 4;
}

// 進捗計算
function calculateProgress(current, previous) {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
```

### パブリックAPI活用の利点
```javascript
// 埋め込み表示用ウィジェット
class FithubWidget {
  constructor(containerId, userId) {
    this.container = document.getElementById(containerId);
    this.userId = userId;
    this.dataService = new FithubDataService();
  }

  async render() {
    try {
      const [weekly, contributions] = await Promise.all([
        this.dataService.getUserWeeklyData(this.userId),
        this.dataService.getUserContributions(this.userId)
      ]);

      this.container.innerHTML = `
        <div class="fithub-widget">
          <h3>フィットネス状況</h3>
          <div class="stats">
            <div>週間歩数: ${weekly.data.total_steps.toLocaleString()}</div>
            <div>週間コントリビューション: ${contributions.data.weekly_total}</div>
          </div>
        </div>
      `;
    } catch (error) {
      this.container.innerHTML = '<div class="error">データの読み込みに失敗しました</div>';
    }
  }
}

// 使用例: 任意のWebサイトに埋め込み
// <div id="my-fitness-widget"></div>
// <script>
//   new FithubWidget('my-fitness-widget', 'user_1752561583127_xengpxnh1').render();
// </script>
```

## 🔧 パフォーマンス考慮事項

### パブリックAPI利用時の注意
- **ユーザーIDの取得**: 認証システムでユーザーIDを提供
- **キャッシュ戦略**: 5-10分間データをキャッシュして負荷軽減
- **エラーハンドリング**: 無効なユーザーIDに対する適切な処理

### 認証API利用時の注意  
- **手動同期**: 1ユーザーあたり1分に1回に制限
- **自動同期**: バックグラウンドで2時間毎に実行
- **トークン管理**: JWT有効期限の適切な処理

### データ読み込み最適化
- **並行読み込み**: 複数エンドポイントの同時呼び出し
- **ローディング状態**: より良いUXのための状態管理
- **エラーバウンダリー**: 失敗したリクエストの適切な処理

### セキュリティ考慮事項
- **ユーザーID推測**: ランダムなIDにより推測攻撃を防止
- **レート制限**: パブリックAPIも適切な制限を実装
- **データプライバシー**: ユーザーの同意に基づく表示制御

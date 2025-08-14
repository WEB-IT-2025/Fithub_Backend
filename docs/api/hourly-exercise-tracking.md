# 2時間毎歩数追跡機能

## 概要
スクリーンショットに示されたUIのように、日中の歩数推移を2時間毎に詳細追跡する機能を実装しました。

## 主な特徴

### 🕐 2時間毎データ収集
- Google Fit APIから2時間間隔で歩数データを取得
- 日中の活動パターンを詳細に追跡
- リアルタイムに近い歩数推移の可視化

### 📊 データ管理
- **EXERCISE_DATE テーブル**: 当日の時間別データを保存
- **自動データクリーンアップ**: 翌日になったら前日のデータを削除
- **パフォーマンス最適化**: 日毎のデータリセットでデータベース肥大化を防止

### ⚡ 自動同期
- **cronジョブ**: 2時間毎（0:00, 2:00, 4:00, ...）に自動実行
- **バックグラウンド処理**: サーバーリソースに配慮した効率的な処理
- **エラーハンドリング**: 失敗時の適切なログ出力とリトライ機能

## API エンドポイント

### 時間別データ取得
```
GET /api/data/hourly
```
- 認証: JWT Bearer Token 必須
- レスポンス: 今日の2時間毎歩数データ（累計歩数含む）

### 手動同期
```
POST /api/data/sync/hourly
```
- 認証: JWT Bearer Token 必須
- 機能: 現在のユーザーの時間別データを即座にGoogle Fitから同期

## データベース構造

### EXERCISE_DATE テーブル
```sql
CREATE TABLE EXERCISE_DATE (
    user_id VARCHAR(64) NOT NULL,
    timestamp DATETIME NOT NULL,
    steps INT NOT NULL,
    PRIMARY KEY (user_id, timestamp),
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE
);
```

### データライフサイクル
1. **データ収集**: 2時間毎にGoogle Fit APIから取得
2. **データ保存**: EXERCISE_DATEテーブルに記録
3. **データ提供**: APIエンドポイント経由でフロントエンドに提供
4. **データクリーンアップ**: 毎日深夜0:01に前日のデータを自動削除

## 技術実装詳細

### Google Fit API統合
- **getUserStepsTodayByHours()**: 2時間バケットでの歩数データ取得
- **タイムゾーン対応**: 日本時間(JST)での正確な時刻管理
- **エラー処理**: API限度超過やネットワークエラーに対する適切な処理

### Cronジョブスケジューリング
```javascript
// 2時間毎実行 (偶数時の0分と30分)
cron.schedule('0,30 */2 * * *', async () => {
    await dataSyncService.syncAllUsersHourlyData()
})
```

### パフォーマンス考慮
- **対象ユーザー最適化**: Googleアクセストークンを持つユーザーのみ処理
- **バッチ処理**: 全ユーザーを効率的に順次処理
- **エラー分離**: 個別ユーザーのエラーが全体処理を停止しない

## フロントエンド統合例

```javascript
// 時間別データ取得
const response = await fetch('/api/data/hourly', {
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
if (data.success) {
  const chartData = data.data.hourly_data.map(point => ({
    x: point.time,
    y: point.totalSteps
  }));
  
  // チャートライブラリでグラフ描画
  renderStepsChart(chartData);
}
```

## 監視とログ

### ログ出力
- `📊 [HOURLY]`: 時間別同期処理の状況
- `🧹 [CLEANUP]`: データクリーンアップの実行結果
- `✅/❌`: 成功・失敗の明確な表示

### 監視項目
- 同期成功率
- API応答時間
- データベース使用量
- エラー発生頻度

## 設定とメンテナンス

### 同期間隔の調整
cronジョブのスケジュールは `cronJobService.ts` で変更可能：
```javascript
// 現在: 2時間毎
'0,30 */2 * * *'

// 1時間毎に変更する場合
'0,30 * * * *'
```

### データ保持期間
現在は当日のみ保持ですが、必要に応じて延長可能：
```javascript
// 過去3日間保持する場合
WHERE DATE(timestamp) < DATE_SUB(CURDATE(), INTERVAL 3 DAY)
```

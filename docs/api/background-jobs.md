# バックグラウンドジョブ

## 概要
Fithubシステムでは、ユーザーデータの自動同期とメンテナンス作業のために複数のバックグラウンドジョブが動作しています。これらのジョブはNode.jsのcronライブラリを使用してスケジュール実行されます。

## 🔄 実行中のジョブ

### 1. データ同期ジョブ（15分毎）

#### 実行スケジュール
```
0,15,30,45 * * * *
```
- 毎時0分、15分、30分、45分に実行
- タイムゾーン: Asia/Tokyo

#### 処理内容
1. **全ユーザースキャン**: データベースから全てのアクティブユーザーを取得
2. **Google Fitデータ同期**: 各ユーザーの当日歩数を取得・更新
3. **GitHubデータ同期**: 各ユーザーの当日コントリビューション数を取得・更新
4. **エラーハンドリング**: 失敗したユーザーのログ記録とリトライ

#### 実装詳細
```javascript
// 15分毎のデータ同期
cron.schedule('0,15,30,45 * * * *', async () => {
    console.log('🔄 [CRON] 15分毎データ同期開始...')
    await dataSyncService.syncAllUsersData()
}, {
    scheduled: true,
    timezone: 'Asia/Tokyo'
})
```

#### 同期対象データ
- **Google Fit**: 当日の歩数データ
- **GitHub**: 当日のコントリビューション数
- **更新方式**: UPSERT（存在すれば更新、なければ挿入）

#### パフォーマンス特性
- **平均実行時間**: ユーザー数 × 2-3秒
- **最大同時接続**: 外部API制限に従う
- **リトライ回数**: ユーザーあたり3回まで

### 2. 日次レコード作成ジョブ（毎日00:01）

#### 実行スケジュール
```
1 0 * * *
```
- 毎日00:01に実行
- タイムゾーン: Asia/Tokyo

#### 処理内容
1. **新しい日の開始**: 全ユーザーに対して新しい日のレコードを準備
2. **初期値設定**: EXERCISEとCONTRIBUTIONSテーブルに初期レコード作成
3. **前日データ最終確認**: 前日のデータが正しく同期されているか確認

#### 実装詳細
```javascript
// 毎日00:01の日次レコード作成
cron.schedule('1 0 * * *', async () => {
    console.log('🌅 [CRON] 新しい日の日次レコード作成中...')
    await dataSyncService.createDailyRecordsForAllUsers()
}, {
    scheduled: true,
    timezone: 'Asia/Tokyo'
})
```

### 3. トークン更新ジョブ（毎時）

#### 実行スケジュール
```
0 * * * *
```
- 毎時00分に実行
- タイムゾーン: Asia/Tokyo

#### 処理内容
1. **期限切れトークン検出**: 1時間以内に期限切れになるGoogleトークンを検索
2. **リフレッシュトークン使用**: refresh_tokenを使用してaccess_tokenを更新
3. **失敗トークン処理**: 更新失敗したトークンのマーキングとログ記録

#### 実装詳細
```javascript
// 毎時のトークン更新
cron.schedule('0 * * * *', async () => {
    console.log('🔑 [CRON] Googleトークン更新中...')
    await googleTokenRefreshService.refreshExpiringTokens()
}, {
    scheduled: true,
    timezone: 'Asia/Tokyo'
})
```

## 📊 ジョブ監視とログ

### ログ出力パターン

#### 成功ログ
```
🔄 [CRON] 15分毎データ同期開始...
✅ [SYNC] ユーザー google_123: 8543歩、3コントリビューション
✅ [SYNC] 全ユーザー同期完了: 成功5/失敗0
```

#### エラーログ
```
❌ [SYNC] ユーザー google_456の同期失敗: Google Fit API rate limit
⚠️  [SYNC] リトライ 2/3: ユーザー google_456
❌ [CRON] データ同期で重大エラー: Database connection timeout
```

#### 統計ログ
```
📊 [SYNC] 統計 - 処理ユーザー数: 10, 成功: 8, 失敗: 2, 実行時間: 45秒
🔄 [SYNC] 次回実行: 2025-07-07T10:45:00.000Z
```

### ジョブ状態確認

#### 管理者エンドポイント
```bash
# トークン状態レポート
GET /api/auth/admin/token-report

# 手動トークン更新
POST /api/auth/admin/refresh-all
```

#### データベース確認クエリ
```sql
-- 最近の同期状態確認
SELECT user_id, day, exercise_quantity, 
       created_at, updated_at
FROM EXERCISE 
WHERE day = CURDATE() 
ORDER BY updated_at DESC;

-- 失敗したトークン確認
SELECT user_id, expires_at, 
       CASE WHEN expires_at < NOW() THEN '期限切れ' ELSE '有効' END as status
FROM GOOGLE_OAUTH_TOKENS 
WHERE expires_at < DATE_ADD(NOW(), INTERVAL 1 HOUR);
```

## 🔧 設定とカスタマイズ

### タイムゾーン設定
```javascript
// cronジョブのタイムゾーン設定
const cronOptions = {
    scheduled: true,
    timezone: 'Asia/Tokyo' // 日本時間
}
```

### 同期頻度の変更
```javascript
// 15分から10分に変更する場合
// 0,15,30,45 * * * * → 0,10,20,30,40,50 * * * *
cron.schedule('0,10,20,30,40,50 * * * *', syncFunction, cronOptions)

// 5分毎に変更する場合
cron.schedule('*/5 * * * *', syncFunction, cronOptions)
```

### リトライ設定
```javascript
// dataSyncServiceの設定
const syncConfig = {
    maxRetries: 3,           // 最大リトライ回数
    retryDelay: 2000,        // リトライ間隔（ミリ秒）
    timeout: 30000,          // API呼び出しタイムアウト
    batchSize: 5             // 同時処理ユーザー数
}
```

## ⚠️ 運用上の注意点

### 1. API制限の考慮
- **Google Fit API**: 1日10,000リクエスト制限
- **GitHub API**: 1時間5,000リクエスト制限
- **対策**: バッチ処理とレート制限の実装

### 2. データベース負荷
- **ピーク時間**: 00:01（日次処理）と15分毎の同期
- **対策**: インデックスの最適化とクエリ効率化
- **監視**: スロークエリログの確認

### 3. 障害時の対応
```javascript
// 障害時の緊急停止
process.on('SIGTERM', () => {
    console.log('🛑 [CRON] 緊急停止シグナル受信')
    cronJobService.stopAllJobs()
    process.exit(0)
})

// メモリ不足時の対応
process.on('uncaughtException', (error) => {
    console.error('💥 [CRON] 予期しないエラー:', error)
    cronJobService.stopAllJobs()
    process.exit(1)
})
```

### 4. スケーリング考慮事項
- **水平スケール**: 複数インスタンス実行時のジョブ重複回避
- **垂直スケール**: メモリとCPU使用量の監視
- **分散処理**: Redis等を使用したジョブキューの検討

## 📈 パフォーマンス最適化

### バッチ処理の最適化
```javascript
// ユーザーをバッチで処理
async function syncUsersInBatches(users, batchSize = 5) {
    for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize)
        await Promise.allSettled(
            batch.map(user => syncUserData(user.user_id))
        )
        
        // バッチ間の小休止
        await new Promise(resolve => setTimeout(resolve, 1000))
    }
}
```

### メモリ使用量の最適化
```javascript
// 大量データ処理時のストリーミング
async function processLargeDataset() {
    const stream = db.query('SELECT * FROM USERS').stream()
    
    stream.on('data', async (user) => {
        await syncUserData(user.user_id)
    })
    
    stream.on('end', () => {
        console.log('✅ [SYNC] 全ユーザー処理完了')
    })
}
```

## 🚨 トラブルシューティング

### よくある問題と解決策

#### 1. ジョブが実行されない
```bash
# cronジョブの状態確認
pm2 logs fithub-backend | grep CRON

# タイムゾーンの確認
node -e "console.log(new Date().toLocaleString('ja-JP', {timeZone: 'Asia/Tokyo'}))"
```

#### 2. 同期エラーが多発
```javascript
// エラー率の確認
const errorRate = failedSyncs / totalSyncs
if (errorRate > 0.1) { // 10%以上のエラー率
    console.warn('⚠️  [SYNC] 高エラー率検出:', errorRate)
    // アラート送信やジョブ一時停止
}
```

#### 3. データベース接続エラー
```javascript
// 接続プールの監視
db.on('connection', () => {
    console.log('🔗 [DB] 新しい接続が確立されました')
})

db.on('error', (error) => {
    console.error('❌ [DB] 接続エラー:', error)
    // 自動再接続の実装
})
```

## 🔮 将来の拡張計画

### 予定されている改善
1. **ジョブキューシステム**: RedisベースのBullキューの導入
2. **リアルタイム監視**: Grafana + Prometheusでのメトリクス監視
3. **アラートシステム**: Slack/Discord通知の実装
4. **A/Bテスト**: 同期頻度の最適化実験

### 実装予定のジョブ
1. **週次レポート生成**: 毎週月曜日にユーザー向けサマリー作成
2. **月次分析**: 月末にトレンド分析とインサイト生成
3. **データクリーンアップ**: 古いデータの定期削除

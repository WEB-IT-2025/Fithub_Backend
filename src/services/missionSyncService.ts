import cron from 'node-cron'
import { missionModel } from '~/models/missionModel'

export const missionSyncService = {
    async syncUserMissionProgress(userId: string) {
        return await missionModel.checkAndUpdateAllMissions(userId)
    },

    async syncAllUsersMissionProgress() {
        const users = await missionModel.getAllUserIds()
        let checked = 0
        let cleared = 0
        for (const user of users) {
            const result = await missionModel.checkAndUpdateAllMissions(user.user_id)
            checked += result.checkedCount
            cleared += result.newlyCleared.length
        }
        return { checked, cleared }
    },
}

// CRON: 全ユーザー同期
cron.schedule('*/15 * * * *', async () => {
    try {
        const result = await missionSyncService.syncAllUsersMissionProgress()
        console.log(`[SYNC] ${result.checked}件チェック、${result.cleared}件クリア`)
    } catch (err) {
        console.error('[SYNC] 同期失敗:', err)
    }
})

// CRON: 0時にリセット
cron.schedule('0 0 * * *', async () => {
    try {
        await missionModel.resetDailyMissions()
        console.log('[RESET] デイリーミッションリセット完了')
    } catch (err) {
        console.error('[RESET] リセット失敗:', err)
    }
})

// 毎週月曜日の0時にweeklyミッションをリセット
cron.schedule('0 0 * * 1', async () => {
    try {
        await missionModel.resetWeeklyMissions()
        console.log('✅ [RESET] ウィークリーミッションをリセットしました。')
    } catch (err) {
        console.error('❌ [RESET] ウィークリーミッションリセット失敗:', err)
    }
})

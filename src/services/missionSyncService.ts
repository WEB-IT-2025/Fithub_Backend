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

import { missionModel } from '~/models/missionModel'
import { dataSyncService } from '~/services/dataSyncService'

export const evaluateUserMissions = async (userId: string): Promise<void> => {
    const missions = await missionModel.getUnclearedMissions(userId)

    const today = new Date().toISOString().split('T')[0]

    for (const mission of missions) {
        const { mission_id, mission_type, mission_goal } = mission

        let currentStatus = 0

        if (mission_type === 'step') {
            const stepsData = await dataSyncService.getWeeklyStepsFromDatabase(userId)
            const todayData = stepsData.find((d) => d.date === today)
            currentStatus = todayData?.steps || 0
        }

        if (mission_type === 'contribution') {
            const contribData = await dataSyncService.getWeeklyContributionsFromDatabase(userId)
            const todayData = contribData.find((d) => d.date === today)
            currentStatus = todayData?.contributions || 0
        }

        await missionModel.updateCurrentStatus(userId, mission_id, currentStatus)

        if (currentStatus >= Number(mission_goal)) {
            await missionModel.markMissionClearedAndReward(userId, mission_id)
        }
    }
}

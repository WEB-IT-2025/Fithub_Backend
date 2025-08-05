import { Request, Response } from 'express'
import { asyncHandler } from '~/middlewares/asyncHandler'
import { missionModel } from '~/models/missionModel'
import { MissionInsertDTO } from '~/models/missionModel'

// MissionRow を export する必要あり

export const getAllMissions = asyncHandler(async (req: Request, res: Response) => {
    const missions = await missionModel.getAllMissions()
    res.status(200).json(missions)
})

export const registerMission = asyncHandler(async (req: Request, res: Response) => {
    const { mission_id, mission_name, mission_content, reward_content, mission_type, mission_category } = req.body

    if (
        !mission_id ||
        !mission_name ||
        !mission_content ||
        reward_content == null ||
        !mission_type ||
        !mission_category
    ) {
        return res.status(400).json({ error: 'すべてのミッション情報を入力してください' })
    }

    const mission: MissionInsertDTO = {
        mission_id,
        mission_name,
        mission_content,
        reward_content,
        mission_type,
        mission_category,
    }

    await missionModel.insertMission(mission)
    res.status(201).json({ message: 'ミッション情報を登録しました。' })
})

export const deleteMission = asyncHandler(async (req: Request, res: Response) => {
    const { mission_id } = req.query

    if (!mission_id) {
        return res.status(400).json({ error: 'mission_idが必要です' })
    }

    const success = await missionModel.deleteMission(String(mission_id))
    if (success) {
        res.status(200).json({ message: 'ミッションを削除しました。' })
    } else {
        res.status(404).json({ error: 'ミッションが見つかりません。' })
    }
})

export const getUserMissionStatus = asyncHandler(async (req: Request, res: Response) => {
    const { user_id } = req.query

    if (!user_id) {
        return res.status(400).json({ error: 'user_idが必要です' })
    }

    const status = await missionModel.getUserMissionStatus(String(user_id))
    res.status(200).json(status)
})

export const clearUserMission = asyncHandler(async (req: Request, res: Response) => {
    const user_id = (req.user as any)?.user_id // 認証されたユーザーから取得
    const { mission_id } = req.body

    if (!user_id || !mission_id) {
        return res.status(400).json({ error: 'user_idとmission_idは必須です' })
    }

    // markMissionClearedAndRewardを使用（重要：markMissionClearedではない）
    const cleared = await missionModel.markMissionClearedAndReward(String(user_id), String(mission_id))

    if (cleared) {
        res.status(200).json({ message: 'ミッションをクリアし、ポイントを付与しました。' })
    } else {
        res.status(404).json({ error: 'ミッションが見つかりません、または既にクリア済みです。' })
    }
})

export const revertUserMission = asyncHandler(async (req: Request, res: Response) => {
    console.log('リクエストボディ:', req.body)

    const { user_id, mission_id } = req.body

    if (!user_id || !mission_id) {
        return res.status(400).json({ error: 'user_idとmission_idは必須です' })
    }

    const reverted = await missionModel.revertMissionCleared(user_id, mission_id)
    if (reverted) {
        res.status(200).json({ message: 'ミッションクリアを取り消しました。' })
    } else {
        res.status(404).json({ error: 'ミッションが見つかりません。' })
    }
})

export const clearMissionAndReward = asyncHandler(async (req: Request, res: Response) => {
    const { user_id, mission_id } = req.params

    if (!user_id || !mission_id) {
        return res.status(400).json({ error: 'user_idとmission_idが必要です' })
    }

    const success = await missionModel.markMissionClearedAndReward(user_id, mission_id)
    if (success) {
        res.status(200).json({ message: 'ミッションをクリアし、ポイントを付与しました。' })
    } else {
        res.status(400).json({ error: 'ミッションクリアに失敗しました。' })
    }
})
/**
 * ミッションクリア状況確認のみ（進捗確認）
 * GET /api/missions/check-status?user_id=xxx&mission_id=xxx
 */
export const getMissionClearStatus = asyncHandler(async (req: Request, res: Response) => {
    const { user_id, mission_id } = req.query

    if (!user_id || !mission_id) {
        return res.status(400).json({ error: 'user_idとmission_idが必要です' })
    }

    const clearStatus = await missionModel.checkMissionClearStatus(String(user_id), String(mission_id))

    if (!clearStatus) {
        return res.status(404).json({ error: 'ミッションまたはユーザーが見つかりません' })
    }

    res.status(200).json(clearStatus)
})

/**
 * ミッション進捗チェック&自動クリア
 * POST /api/missions/check-progress
 * Body: { user_id: string, mission_id: string }
 */
export const checkMissionProgress = asyncHandler(async (req: Request, res: Response) => {
    const { user_id, mission_id } = req.body

    if (!user_id || !mission_id) {
        return res.status(400).json({ error: 'user_idとmission_idが必要です' })
    }

    const result = await missionModel.updateMissionProgress(user_id, mission_id)

    if (!result.updated) {
        return res.status(404).json({ error: 'ミッションまたはユーザーが見つかりません' })
    }

    if (result.cleared) {
        res.status(200).json({
            message: 'ミッションをクリアしました！報酬を獲得しました。',
            data: result.progressData,
        })
    } else {
        res.status(200).json({
            message: '進捗を更新しました。',
            data: result.progressData,
        })
    }
})

/**
 * 全ミッション一括進捗チェック
 * POST /api/missions/check-all-progress
 * Body: { user_id: string }
 */
export const checkAllMissionProgress = asyncHandler(async (req: Request, res: Response) => {
    const { user_id } = req.body

    if (!user_id) {
        return res.status(400).json({ error: 'user_idが必要です' })
    }

    const result = await missionModel.checkAndUpdateAllMissions(user_id)

    res.status(200).json({
        message: `${result.checkedCount}個のミッションをチェックしました。`,
        checkedCount: result.checkedCount,
        newlyCleared: result.newlyCleared,
        newlyClearedCount: result.newlyCleared.length,
    })
})

export const getUserMissionDetails = asyncHandler(async (req: Request, res: Response) => {
    const { user_id, category, cleared } = req.query

    if (!user_id) {
        return res.status(400).json({ error: 'user_idが必要です' })
    }

    let missions = await missionModel.getUserMissionDetails(String(user_id))

    if (category) {
        missions = missions.filter((m) => m.mission_category.toLowerCase() === String(category).toLowerCase())
    }

    if (cleared === 'false') {
        missions = missions.filter((m) => m.clear_status == false)
    }

    res.status(200).json(missions)
})

export const syncMissions = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.user_id
    if (!userId) {
        return res.status(401).json({ error: '認証が必要です' })
    }

    const now = new Date()

    // 1) 日次リセット（毎日0時以降の最初の呼び出しで実行）
    //    └ ログなどで「最後に日次リセットした日時」を保持すれば、二重実行防止も可能
    await missionModel.resetDailyMissions()

    // 2) 週次リセット（毎週月曜日0時以降の最初の呼び出しで実行）
    if (now.getDay() === 1) {
        // 0=日曜,1=月曜…
        await missionModel.resetWeeklyMissions()
    }

    // 3) 進捗チェック＆クリア
    const result = await missionModel.checkAndUpdateAllMissions(userId)

    res.status(200).json({
        message: `${result.checkedCount}件のミッションを同期しました。`,
        checkedCount: result.checkedCount,
        newlyCleared: result.newlyCleared,
        newlyClearedCount: result.newlyCleared.length,
    })
})
export const claimAllRewards = asyncHandler(async (req: Request, res: Response) => {
    const user_id = (req.user as any)?.user_id
    if (!user_id) return res.status(401).json({ error: '認証が必要です' })

    const claimableMissions = await missionModel.getUnclaimedRewards(user_id)
    if (claimableMissions.length === 0) {
        return res.status(200).json({ message: '受け取れる報酬はありません。', claimed: 0, totalPoints: 0 })
    }

    let totalPoints = 0
    for (const m of claimableMissions) {
        totalPoints += Number(m.reward_content)
        await missionModel.markRewardReceived(user_id, m.mission_id)
    }

    await missionModel.addUserPoints(user_id, totalPoints)

    res.status(200).json({
        message: `${claimableMissions.length}個の報酬を受け取りました`,
        claimed: claimableMissions.length,
        totalPoints,
    })
})

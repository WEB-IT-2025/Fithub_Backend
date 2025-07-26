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
    const { mission_id, mission_name, mission_content, reward_content, mission_type } = req.body

    if (!mission_id || !mission_name || !mission_content || reward_content == null || !mission_type) {
        return res.status(400).json({ error: 'すべてのミッション情報を入力してください' })
    }

    const mission: MissionInsertDTO = { mission_id, mission_name, mission_content, reward_content, mission_type }

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
    const { user_id, mission_id } = req.body

    if (!user_id || !mission_id) {
        return res.status(400).json({ error: 'user_idとmission_idは必須です' })
    }

    const cleared = await missionModel.markMissionCleared(String(user_id), String(mission_id))

    if (cleared) {
        res.status(200).json({ message: 'ミッションをクリアしました。' })
    } else {
        res.status(404).json({ error: 'ミッションが見つかりません' })
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

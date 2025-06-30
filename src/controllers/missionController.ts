import { Request, Response } from 'express'
import { asyncHandler } from '~/middlewares/asyncHandler'
import { missionModel } from '~/models/missionModel'

export const getAllMissions = asyncHandler(async (req: Request, res: Response) => {
    const missions = await missionModel.getAllMissions()
    res.status(200).json(missions)
})

export const registerMission = asyncHandler(async (req: Request, res: Response) => {
    const mission = req.body
    await missionModel.insertMission(mission)
    res.status(201).json({ message: 'ミッション情報を登録しました。' })
})

export const deleteMission = asyncHandler(async (req: Request, res: Response) => {
    const { mission_id } = req.params
    const success = await missionModel.deleteMission(mission_id)

    if (success) {
        res.status(200).json({ message: 'ミッションを削除しました。' })
    } else {
        res.status(400).json({ error: 'ミッションが見つかりません。' })
    }
})

export const getUserMissionStatus = asyncHandler(async (req: Request, res: Response) => {
    const { user_id } = req.params
    const status = await missionModel.getUserMissionStatus(user_id)
    res.status(200).json(status)
})

export const clearUserMission = asyncHandler(async (req: Request, res: Response) => {
    const { user_id, mission_id } = req.params
    const cleared = await missionModel.markMissionCleared(user_id, mission_id)

    if (cleared) {
        res.status(200).json({ message: 'ミッションをクリアしました。' })
    } else {
        res.status(400).json({ message: 'ミッションがありません' })
    }
})

export const revertUserMission = asyncHandler(async (req: Request, res: Response) => {
    const { user_id, mission_id } = req.params
    const reverted = await missionModel.revertMissionCleared(user_id, mission_id)

    if (reverted) {
        res.status(200).json({ message: 'ミッションクリアを取り消しました。' })
    } else {
        res.status(400).json({ message: 'ミッションがありません' })
    }
})

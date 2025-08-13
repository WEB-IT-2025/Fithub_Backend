import { Request, Response } from 'express'
import { evaluateUserMissions } from '~/services/missionEvaluator'

export const evaluateMissionsHandler = async (req: Request, res: Response): Promise<void> => {
    const { user_id } = req.params
    if (!user_id) {
        res.status(400).json({ error: 'user_idが必要です' })
        return
    }

    try {
        await evaluateUserMissions(user_id)
        res.status(200).json({ message: '評価が完了しました' })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'ミッション評価中にエラーが発生しました' })
    }
}

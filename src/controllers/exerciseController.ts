// src/controllers/exerciseController.ts
import { Request, Response } from 'express'
import { EXERCISE_MESSAGES } from '~/constants/messages'
import { asyncHandler } from '~/middlewares/asyncHandler'
import { exerciseModel } from '~/models/exerciseModel'
import { thresholdModel } from '~/models/thresholdModel'
import { userModel } from '~/models/userModel'

/**
 * 歩数データを記録し、ポイントを自動加算する（TIMESTAMP対応版）
 * @param req - リクエスト（user_id, steps, recorded_at 必須）
 * @param res - レスポンス
 */
export const recordExercise = asyncHandler(async (req: Request, res: Response) => {
    const { user_id, steps, recorded_at } = req.body

    if (!user_id || !steps || !recorded_at) {
        return res.status(400).json({
            success: false,
            message: 'user_id, recorded_at, stepsは必須です',
        })
    }

    // 1. 歩数データの登録・更新
    await exerciseModel.upsertExercise(user_id, recorded_at, steps)

    // 2. 歩数 → ポイント換算（設定値取得）
    const stepPointRate = await thresholdModel.getStepPointRate()
    const pointToAdd = Math.floor(steps / stepPointRate)

    // 3. ポイント加算
    if (pointToAdd > 0) {
        await userModel.addPoint(user_id, pointToAdd)
    }

    // 4. 結果レスポンス
    return res.status(200).json({
        success: true,
        message: EXERCISE_MESSAGES.RECORD_SUCCESS,
        data: { user_id, recorded_at, steps, point_added: pointToAdd },
    })
})

export const getHourlyExerciseSummary = asyncHandler(async (req: Request, res: Response) => {
    const { user_id, date } = req.query

    const summary = await exerciseModel.getHourlySummary(String(user_id), String(date))

    return res.status(200).json({
        success: true,
        data: summary,
    })
})
// TODO: 24時間ごと集計機能の実装
// 日ごと歩数集計API
export const getDailyExerciseSummary = asyncHandler(async (req: Request, res: Response) => {
    const { user_id, start_date, end_date } = req.query

    const summary = await exerciseModel.getDailySummary(String(user_id), String(start_date), String(end_date))

    return res.status(200).json({
        success: true,
        data: summary,
    })
})

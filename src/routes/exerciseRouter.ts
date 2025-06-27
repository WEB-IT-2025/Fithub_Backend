// src/routes/exerciseRouter.ts
import express from 'express'
import { getDailyExerciseSummary, getHourlyExerciseSummary, recordExercise } from '~/controllers/exerciseController'
import { requireCompleteUser } from '~/middlewares/requireCompleteUser'
import { handleValidationErrors } from '~/middlewares/validation'
import {
    validateDailySummaryRequest,
    validateHourlySummaryRequest,
    validateTimestampExerciseRecord,
} from '~/middlewares/validation/exerciseValidation'

const router = express.Router()

// 歩数データ送信API（TIMESTAMP対応版）
router.post(
    '/exercise-date',
    requireCompleteUser,
    validateTimestampExerciseRecord,
    handleValidationErrors,
    recordExercise
)

// 時間ごと歩数集計API
router.get(
    '/hourly-summary',
    requireCompleteUser,
    validateHourlySummaryRequest,
    handleValidationErrors,
    getHourlyExerciseSummary
)

// 日ごと集計
router.get(
    '/daily-summary',
    requireCompleteUser,
    validateDailySummaryRequest,
    handleValidationErrors,
    getDailyExerciseSummary
)

export default router

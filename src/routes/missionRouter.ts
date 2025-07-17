import express from 'express'
// src/routes/missionRoutes.ts
import { evaluateMissionsHandler } from '~/controllers/evaluationController'
import {
    clearUserMission,
    deleteMission,
    getAllMissions,
    getUserMissionStatus,
    registerMission,
    revertUserMission,
} from '~/controllers/missionController'
import { requireAdmin } from '~/middlewares/requireAdmin'
import { requireCompleteUser } from '~/middlewares/requireCompleteUser'
import { handleValidationErrors } from '~/middlewares/validation'
import {
    validateClearMissionBody,
    validateMissionIdParam,
    validateMissionRegistration,
    validateRevertMissionBody,
} from '~/middlewares/validation/missionValidation'

const router = express.Router()

// ミッション一覧
router.get('/list', getAllMissions)

// ミッション登録（管理者）
router.post('/admin/mission_create', requireAdmin, validateMissionRegistration, handleValidationErrors, registerMission)

// ミッション削除（管理者）
router.delete('/admin/mission_delete', requireAdmin, validateMissionIdParam, handleValidationErrors, deleteMission)

// ミッション状況取得
router.get('/status', requireCompleteUser, handleValidationErrors, getUserMissionStatus)

// ミッションクリア
router.post('/clear', requireCompleteUser, validateClearMissionBody, handleValidationErrors, clearUserMission)

// ミッションクリア取り消し（管理者）
router.put('/admin/revert', requireAdmin, validateRevertMissionBody, handleValidationErrors, revertUserMission)

// ミッション評価（管理者トリガー）
router.post('/admin/evaluate/:user_id', requireAdmin, evaluateMissionsHandler)

export default router

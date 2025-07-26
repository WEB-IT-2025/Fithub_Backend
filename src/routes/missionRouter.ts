import express from 'express'
// src/routes/missionRoutes.ts
import {
    checkAllMissionProgress,
    checkMissionProgress,
    clearUserMission,
    deleteMission,
    getAllMissions,
    getMissionClearStatus,
    getUserMissionStatus,
    registerMission,
    revertUserMission,
} from '~/controllers/missionController'
import { authenticateJWT } from '~/middlewares/authenticateJWT'
import { requireAdmin } from '~/middlewares/requireAdmin'
import { requireCompleteUser } from '~/middlewares/requireCompleteUser'
import { handleValidationErrors } from '~/middlewares/validation'
import {
    validateClearMissionBody,
    validateMissionIdQuery,
    validateMissionRegistration,
    validateRevertMissionBody,
} from '~/middlewares/validation/missionValidation'

const router = express.Router()

// ミッション一覧
router.get('/list', getAllMissions)

// ミッション状況取得
router.get('/status', requireCompleteUser, handleValidationErrors, getUserMissionStatus)

// ミッションクリア状況確認のみ（進捗確認）
router.get('/check-status', requireCompleteUser, handleValidationErrors, getMissionClearStatus)

// ミッション進捗チェック&自動クリア
router.post('/check-progress', requireCompleteUser, handleValidationErrors, checkMissionProgress)

// 全ミッション一括進捗チェック
router.post('/check-all-progress', requireCompleteUser, handleValidationErrors, checkAllMissionProgress)

// ミッションクリア(成功)
router.post('/clear', requireCompleteUser, validateClearMissionBody, handleValidationErrors, clearUserMission)

// それ以外の管理系は認証付き
router.use(authenticateJWT)

// ミッション登録（管理者）
router.post('/admin/mission_create', requireAdmin, validateMissionRegistration, handleValidationErrors, registerMission)

// ミッション削除（管理者）
router.delete('/admin/mission_delete', requireAdmin, validateMissionIdQuery, handleValidationErrors, deleteMission)

// ミッションクリア取り消し（管理者）
router.put('/admin/revert', requireAdmin, validateRevertMissionBody, handleValidationErrors, revertUserMission)

export default router

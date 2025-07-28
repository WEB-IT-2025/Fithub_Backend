import express from 'express'
// src/routes/missionRoutes.ts
import {
    checkAllMissionProgress,
    checkMissionProgress,
    clearUserMission,
    deleteMission,
    getAllMissions,
    getMissionClearStatus,
    getUserMissionDetails,
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

// ミッション一覧(テスト済み)
router.get('/list', getAllMissions)

// ミッション状況取得
router.get('/status', requireCompleteUser, handleValidationErrors, getUserMissionStatus)

// ミッション詳細一覧(daily, weekly判別)(テスト済み)
router.get('/details', requireCompleteUser, handleValidationErrors, getUserMissionDetails)
// ミッションクリア状況確認のみ（進捗確認）(テスト済み)

// http://localhost:3000/api/mission/check-status?user_id=xxx&mission_id=mx
router.get('/check-status', requireCompleteUser, handleValidationErrors, getMissionClearStatus)

// ミッション進捗チェック&自動クリア(テスト済み)
router.post('/check-progress', requireCompleteUser, handleValidationErrors, checkMissionProgress)

// 全ミッション一括進捗チェック(テスト済み)
router.post('/check-all-progress', requireCompleteUser, handleValidationErrors, checkAllMissionProgress)

// ミッションクリア(テスト済み)
router.post('/clear', requireCompleteUser, handleValidationErrors, clearUserMission)

// それ以外の管理系は認証付き
router.use(authenticateJWT)

// ミッション登録（運営）(テスト済み)
router.post('/admin/mission_create', requireAdmin, validateMissionRegistration, handleValidationErrors, registerMission)

// ミッション削除（運営）(テスト済み)
router.delete('/admin/mission_delete', requireAdmin, validateMissionIdQuery, handleValidationErrors, deleteMission)

// ミッションクリア取り消し（運営）(テスト済み)
router.put('/admin/revert', requireAdmin, validateRevertMissionBody, handleValidationErrors, revertUserMission)

export default router

import express from 'express'
// src/routes/missionRoutes.ts
import {
    claimAllRewards,
    clearUserMission,
    deleteMission,
    getAllMissions,
    getRewardStatus,
    getUserMissionDetails,
    registerMission,
    revertUserMission,
    syncMissions,
} from '~/controllers/missionController'
import { authenticateJWT } from '~/middlewares/authenticateJWT'
import { requireAdmin } from '~/middlewares/requireAdmin'
import { requireCompleteUser } from '~/middlewares/requireCompleteUser'
import { handleValidationErrors } from '~/middlewares/validation'
import {
    validateMissionIdQuery,
    validateMissionRegistration,
    validateRevertMissionBody,
} from '~/middlewares/validation/missionValidation'

const router = express.Router()

// === 一般ユーザー向けAPI ===

// ミッション一覧取得
router.get('/list', getAllMissions)

// ユーザーのミッション詳細一覧（進捗含む）
router.get('/details', requireCompleteUser, handleValidationErrors, getUserMissionDetails)

// ミッション同期処理（進捗チェック + 自動クリア判定）
router.put('/sync', requireCompleteUser, syncMissions)

// 手動ミッションクリア
router.put('/clear', requireCompleteUser, handleValidationErrors, clearUserMission)

// 報酬一括受け取り
router.put('/claim-rewards', requireCompleteUser, claimAllRewards)

// 報酬状況確認
router.get('/rewards', requireCompleteUser, getRewardStatus)

// === 管理者向けAPI ===
router.use(authenticateJWT)

// ミッション登録（運営）
router.post('/admin/create', requireAdmin, validateMissionRegistration, handleValidationErrors, registerMission)

// ミッション削除（運営）
router.delete('/admin/delete', requireAdmin, validateMissionIdQuery, handleValidationErrors, deleteMission)

// ミッションクリア取り消し（運営）
router.put('/admin/revert', requireAdmin, validateRevertMissionBody, handleValidationErrors, revertUserMission)

export default router

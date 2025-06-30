import express from 'express'
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
import { validateMissionIdParam, validateMissionRegistration } from '~/middlewares/validation/missionValidation'

const router = express.Router()

// ミッション一覧
router.get('/missions', getAllMissions)

// ミッション登録（管理者）
router.post('/missions/:mission_id', requireAdmin, validateMissionRegistration, handleValidationErrors, registerMission)

// ミッション削除（管理者）
router.delete('/missions/:mission_id', requireAdmin, validateMissionIdParam, handleValidationErrors, deleteMission)

// ミッション状況取得
router.get('/missions/status/:user_id', requireCompleteUser, handleValidationErrors, getUserMissionStatus)

// ミッションクリア
router.post('/missions/clear/:user_id/:mission_id', requireCompleteUser, handleValidationErrors, clearUserMission)

// ミッションクリア取り消し（管理者）
router.post('/missions/revert/:user_id/:mission_id', requireAdmin, handleValidationErrors, revertUserMission)

export default router

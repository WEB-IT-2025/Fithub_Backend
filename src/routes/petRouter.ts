import express from 'express'
import {
    getUserPetSizesDebug,
    getUserPets,
    getUserProfile,
    updateAllPetGrowth,
    updatePetGrowth,
    updatePetHealthStandard,
    updatePetSizeDebug,
    updatePetSizeStandard,
    updateUserMainPet,
    useIntimacyItem,
} from '~/controllers/petController'
import { authenticateJWT } from '~/middlewares/authenticateJWT'
import { requireAdmin } from '~/middlewares/requireAdmin'
import { requireCompleteUser } from '~/middlewares/requireCompleteUser'
import { handleValidationErrors } from '~/middlewares/validation'
import {
    updateMainPetValidation,
    updatePetHealthStandardValidation,
    updatePetSizeStandardValidation,
} from '~/middlewares/validation/petValidation'

const router = express.Router()

// === ユーザー向けAPI ===

// ユーザープロフィール取得（メインペット情報）
router.get('/profile/:userId', getUserProfile)

// 所有しているペット一覧取得
router.get('/owned', requireCompleteUser, getUserPets)

// 主ペット更新
router.put('/main', requireCompleteUser, updateMainPetValidation, handleValidationErrors, updateUserMainPet)

// ペット成長データ更新
router.put('/growth', requireCompleteUser, updatePetGrowth)

// 親密度アイテム使用
router.post('/intimacy-item', requireCompleteUser, useIntimacyItem)

// === 管理者向けAPI ===
router.use(authenticateJWT)

// ペットサイズ基準更新
router.put(
    '/admin/size-standard',
    requireAdmin,
    updatePetSizeStandardValidation,
    handleValidationErrors,
    updatePetSizeStandard
)

// ペット健康度基準更新
router.put(
    '/admin/health-standard',
    requireAdmin,
    updatePetHealthStandardValidation,
    handleValidationErrors,
    updatePetHealthStandard
)

// 全ユーザーペット成長データ更新
router.put('/admin/growth-all', requireAdmin, updateAllPetGrowth)

// === デバッグ用API（管理者のみ） ===

// ペットサイズ直接更新（デバッグ用）
router.put('/debug/size', requireAdmin, updatePetSizeDebug)

// ユーザーのペットサイズ一覧取得（デバッグ用）
router.get('/debug/sizes/:userId', requireAdmin, getUserPetSizesDebug)

export default router

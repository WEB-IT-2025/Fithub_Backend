import express from 'express'
import {
    getUserName,
    getUserPets,
    getUserProfile,
    updateAllPetGrowth,
    updatePetGrowth,
    updatePetHealthStandard,
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

// ユーザー名のみ取得
router.get('/name', requireCompleteUser, getUserName)

// ユーザープロフィール取得（メインペット情報）
router.get('/profile', requireCompleteUser, getUserProfile)

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

export default router

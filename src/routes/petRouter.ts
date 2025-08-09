import express from 'express'
import {
    getUserPets,
    getUserProfile,
    updatePetHealthStandard,
    updatePetSizeStandard,
    updateUserMainPet,
} from '~/controllers/petController'
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
router.get('/profile', requireCompleteUser, getUserProfile)

// 所有しているペット一覧取得
router.get('/owned', requireCompleteUser, getUserPets)

// 主ペット更新
router.put('/main', requireCompleteUser, updateMainPetValidation, handleValidationErrors, updateUserMainPet)

// === 管理者向けAPI ===

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

export default router

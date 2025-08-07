import express from 'express'
import {
    deletePet,
    getUserPets,
    getUserProfile,
    registerPet,
    updatePetHealthStandard,
    updatePetSizeStandard,
    updateUserMainPet,
    updateUserSubPet,
} from '~/controllers/petController'
import { requireAdmin } from '~/middlewares/requireAdmin'
import { requireCompleteUser } from '~/middlewares/requireCompleteUser'
import { handleValidationErrors } from '~/middlewares/validation'
import {
    validatePetHealthStandard,
    validatePetIdParam,
    validatePetRegistration,
    validatePetSizeStandard,
    validateUpdateMainPetBody,
    validateUpdateSubPetBody,
} from '~/middlewares/validation/petValidation'

const router = express.Router()

// ユーザーのプロフィール情報取得（ペット情報含む）
router.get('/users/profile', requireCompleteUser, getUserProfile)

// ユーザーのペット一覧取得
router.get('/users/pets', requireCompleteUser, handleValidationErrors, getUserPets)

// 主ペット更新
router.put(
    '/users/pets/:pet_id/main',
    requireCompleteUser,
    validatePetIdParam,
    validateUpdateMainPetBody,
    handleValidationErrors,
    updateUserMainPet
)

// サブペット更新
router.put(
    '/users/pets/:pet_id/sub',
    requireCompleteUser,
    validatePetIdParam,
    validateUpdateSubPetBody,
    handleValidationErrors,
    updateUserSubPet
)

// ペット登録（管理者）
router.post('/admin/pets', requireAdmin, validatePetRegistration, handleValidationErrors, registerPet)

// ペット削除（管理者）
router.delete('/admin/pets/:pet_id', requireAdmin, validatePetIdParam, handleValidationErrors, deletePet)

// ペットサイズ基準更新（管理者）
router.put(
    '/admin/standards/pet_size',
    requireAdmin,
    validatePetSizeStandard,
    handleValidationErrors,
    updatePetSizeStandard
)

// ペット健康度基準更新（管理者）
router.put(
    '/admin/standards/pet_health',
    requireAdmin,
    validatePetHealthStandard,
    handleValidationErrors,
    updatePetHealthStandard
)

export default router

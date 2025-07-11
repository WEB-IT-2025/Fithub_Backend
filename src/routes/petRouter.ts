import express from 'express';
import {
    getUserPets,
    updateUserMainPet,
    updateUserSubPet,
    registerPet,
    deletePet
} from '~/controllers/petController';
import { requireAdmin } from '~/middlewares/requireAdmin';
import { requireCompleteUser } from '~/middlewares/requireCompleteUser';
import { handleValidationErrors } from '~/middlewares/validation';
import {
    validatePetRegistration,
    validatePetIdParam,
    validateUpdateMainPetBody,
    validateUpdateSubPetBody
} from '~/middlewares/validation/petValidation';

const router = express.Router();

// ユーザーのペット一覧取得
router.get('/users/pets', requireCompleteUser, handleValidationErrors, getUserPets);

// 主ペット更新
router.put(
    '/users/pets/:pet_id/main',
    requireCompleteUser,
    validatePetIdParam,
    validateUpdateMainPetBody,
    handleValidationErrors,
    updateUserMainPet
);

// サブペット更新
router.put(
    '/users/pets/:pet_id/sub',
    requireCompleteUser,
    validatePetIdParam,
    validateUpdateSubPetBody,
    handleValidationErrors,
    updateUserSubPet
);

// ペット登録（管理者）
router.post(
    '/admin/pets',
    requireAdmin,
    validatePetRegistration,
    handleValidationErrors,
    registerPet
);

// ペット削除（管理者）
router.delete(
    '/admin/pets/:pet_id',
    requireAdmin,
    validatePetIdParam,
    handleValidationErrors,
    deletePet
);

export default router;
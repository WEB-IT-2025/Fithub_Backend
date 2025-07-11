import { body, param } from 'express-validator';

// ペット登録バリデーション
export const validatePetRegistration = [
    body('pet_id').notEmpty().withMessage('pet_idは必須です'),
    body('pet_name').notEmpty().withMessage('pet_nameは必須です'),
    body('pet_image_folder').notEmpty().withMessage('pet_image_folderは必須です'),
];

// ペットIDパラメータバリデーション
export const validatePetIdParam = [
    param('pet_id').notEmpty().withMessage('pet_idは必須です'),
];

// 主ペット更新バリデーション
export const validateUpdateMainPetBody = [
    body('user_main_pet').isBoolean().withMessage('user_main_petはboolean型で指定してください'),
];

// サブペット更新バリデーション
export const validateUpdateSubPetBody = [
    body('user_sub_pet').isBoolean().withMessage('user_sub_petはboolean型で指定してください'),
];
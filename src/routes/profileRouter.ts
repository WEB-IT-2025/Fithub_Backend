// ===== routes/profileRouter.ts =====
import express from 'express'
import { ProfileController } from '~/controllers/profileController'
import { ProfileValidation } from '~/middlewares/validation/profileValidation'

const profileRouter = express.Router()

// プロフィール一括取得（自分 + 相手）
// GET /api/profile/profiles?user_id=user_1752727005014_t8m7zt00i
profileRouter.get(
    '/profiles',
    ProfileValidation.getProfilesQuery,
    ProfileValidation.handleValidationErrors,
    ProfileController.getProfiles
)

// 単一ユーザープロフィール取得
// GET /api/profile/user?user_id=user_1752727005014_t8m7zt00i
// routes/profileRouter.ts
profileRouter.get(
    '/user',
    ProfileValidation.getProfilesQuery,
    ProfileValidation.handleValidationErrors,
    ProfileController.getUserProfile
)

// プロフィール更新
// PUT /api/profile/update?user_id=user_1752727005014_t8m7zt00i
profileRouter.put(
    '/update',
    ProfileValidation.updateProfileQuery,
    ProfileValidation.handleValidationErrors,
    ProfileController.updateProfile
)

// GitHub URL生成
// GET /api/profile/github-url?github_username=username
profileRouter.get(
    '/github-url',
    ProfileValidation.getGithubUrlQuery,
    ProfileValidation.handleValidationErrors,
    ProfileController.getGithubUrl
)
// routes/profileRouter.ts
profileRouter.get(
    '/partner-profile',
    ProfileValidation.getPartnerProfileQuery,
    ProfileValidation.handleValidationErrors,
    ProfileController.getPartnerProfile
)

export default profileRouter

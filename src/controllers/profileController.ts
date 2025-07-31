// ===== controllers/profileController.ts =====
import { Request, Response } from 'express'
import { groupModel } from '~/models/groupModel'
import { profileModel } from '~/models/profileModel'

export class ProfileController {
    static async getPartnerProfile(req: Request, res: Response): Promise<void> {
        try {
            const requesterId = req.query.requester_id as string
            const targetUserId = req.query.target_user_id as string

            if (!requesterId || !targetUserId) {
                void res.status(400).json({ message: '両方の user_id が必要です' })
                return
            }

            const [requesterGroups, targetGroups] = await Promise.all([
                groupModel.getGroupsByUserId(requesterId),
                groupModel.getGroupsByUserId(targetUserId),
            ])

            const requesterGroupIds = new Set(requesterGroups.map((g) => g.group_id))
            const sharedGroup = targetGroups.find((g) => requesterGroupIds.has(g.group_id))

            if (!sharedGroup) {
                void res.status(403).json({ message: '同じグループに所属していません' })
                return
            }

            const user = await profileModel.getUserById(targetUserId)
            if (!user) {
                void res.status(404).json({ message: '対象ユーザーが見つかりません' })
                return
            }

            const profile = await profileModel.buildProfileResponse(user)

            res.json({
                success: true,
                data: profile,
            })
        } catch (error) {
            console.error('Partner profile fetch error:', error)
            res.status(500).json({
                success: false,
                message: 'プロフィールの取得に失敗しました',
            })
        }
    }
    // プロフィール一括取得（自分 + パートナー）
    // GET /api/profile/profiles?user_id={user_id}
    static async getProfiles(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.query.user_id as string

            const profiles = await profileModel.getProfilesWithPartner(userId)

            if (!profiles) {
                res.status(404).json({
                    success: false,
                    message: 'ユーザーまたはパートナーが見つかりません',
                })
                return
            }

            res.json({
                success: true,
                data: profiles,
            })
        } catch (error) {
            console.error('Profile fetch error:', error)
            res.status(500).json({
                success: false,
                message: 'プロフィールの取得に失敗しました',
            })
        }
    }

    // 単一ユーザープロフィール取得
    // GET /api/profile/user?user_id=user_1752727005014_t8m7zt00i
    static async getUserProfile(req: Request, res: Response): Promise<void> {
        try {
            console.log('🔥 [Controller] getUserProfile accessed', req.query)
            const userId = req.query.user_id as string

            const user = await profileModel.getUserById(userId)

            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'ユーザーが見つかりません',
                })
                return
            }

            const profile = await profileModel.buildProfileResponse(user)

            res.json({
                success: true,
                data: profile,
            })
        } catch (error) {
            console.error('User profile fetch error:', error)
            res.status(500).json({
                success: false,
                message: 'ユーザープロフィールの取得に失敗しました',
            })
        }
    }

    // プロフィール更新
    // PUT /api/profile/update?user_id=user_1752727005014_t8m7zt00i
    static async updateProfile(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.query.user_id as string
            const updateData = req.body

            const updatedUser = await profileModel.updateProfile(userId, updateData)

            if (!updatedUser) {
                res.status(404).json({
                    success: false,
                    message: 'ユーザーが見つからないか、更新データが無効です',
                })
                return
            }

            res.json({
                success: true,
                data: updatedUser,
                message: 'プロフィールが正常に更新されました',
            })
        } catch (error) {
            console.error('Profile update error:', error)
            res.status(500).json({
                success: false,
                message: 'プロフィールの更新に失敗しました',
            })
        }
    }

    // GitHub URL取得
    // GET /api/profile/github-url?github_username=username
    static async getGithubUrl(req: Request, res: Response): Promise<void> {
        try {
            const githubUsername = req.query.github_username as string

            res.json({
                success: true,
                data: {
                    url: `https://github.com/${githubUsername}`,
                    avatar: `https://github.com/${githubUsername}.png`,
                },
            })
        } catch (error) {
            console.error('GitHub URL generation error:', error)
            res.status(500).json({
                success: false,
                message: 'GitHub URLの生成に失敗しました',
            })
        }
    }
}

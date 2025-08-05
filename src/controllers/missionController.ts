import { Request, Response } from 'express'
import { asyncHandler } from '~/middlewares/asyncHandler'
import { missionModel } from '~/models/missionModel'
import { MissionInsertDTO } from '~/models/missionModel'
import { UserPayload } from '~/types/UserPayload'

export const getAllMissions = asyncHandler(async (req: Request, res: Response) => {
    const missions = await missionModel.getAllMissions()
    res.status(200).json(missions)
})

export const registerMission = asyncHandler(async (req: Request, res: Response) => {
    const { mission_id, mission_name, mission_content, reward_content, mission_type, mission_category } = req.body

    if (
        !mission_id ||
        !mission_name ||
        !mission_content ||
        reward_content == null ||
        !mission_type ||
        !mission_category
    ) {
        return res.status(400).json({ error: 'すべてのミッション情報を入力してください' })
    }

    const mission: MissionInsertDTO = {
        mission_id,
        mission_name,
        mission_content,
        reward_content,
        mission_type,
        mission_category,
    }

    await missionModel.insertMission(mission)
    res.status(201).json({ message: 'ミッション情報を登録しました。' })
})

export const deleteMission = asyncHandler(async (req: Request, res: Response) => {
    const { mission_id } = req.query

    if (!mission_id) {
        return res.status(400).json({ error: 'mission_idが必要です' })
    }

    const success = await missionModel.deleteMission(String(mission_id))
    if (success) {
        res.status(200).json({ message: 'ミッションを削除しました。' })
    } else {
        res.status(404).json({ error: 'ミッションが見つかりません。' })
    }
})

export const getUserMissionStatus = asyncHandler(async (req: Request, res: Response) => {
    const { user_id } = req.query

    if (!user_id) {
        return res.status(400).json({ error: 'user_idが必要です' })
    }

    const status = await missionModel.getUserMissionStatus(String(user_id))
    res.status(200).json(status)
})

export const clearUserMission = asyncHandler(async (req: Request, res: Response) => {
    const user_id = (req.user as UserPayload)?.user_id // 認証されたユーザーから取得
    const { mission_id } = req.body

    if (!user_id || !mission_id) {
        return res.status(400).json({ error: 'user_idとmission_idは必須です' })
    }

    // markMissionClearedAndRewardを使用（重要：markMissionClearedではない）
    const cleared = await missionModel.markMissionClearedAndReward(String(user_id), String(mission_id))

    if (cleared) {
        res.status(200).json({
            message: 'ミッションをクリアしました！報酬は翌日以降に受け取ることができます。',
            note: '報酬の受け取りは、ミッションクリアの翌日から可能です。',
        })
    } else {
        res.status(404).json({ error: 'ミッションが見つかりません、または既にクリア済みです。' })
    }
})

export const revertUserMission = asyncHandler(async (req: Request, res: Response) => {
    console.log('リクエストボディ:', req.body)

    const { user_id, mission_id } = req.body

    if (!user_id || !mission_id) {
        return res.status(400).json({ error: 'user_idとmission_idは必須です' })
    }

    const reverted = await missionModel.revertMissionCleared(user_id, mission_id)
    if (reverted) {
        res.status(200).json({
            message: 'ミッションクリアを取り消しました。',
            note: '既に受け取った報酬がある場合は、ポイントから差し引かれました。',
        })
    } else {
        res.status(404).json({ error: 'ミッションが見つかりません。' })
    }
})

export const clearMissionAndReward = asyncHandler(async (req: Request, res: Response) => {
    const { user_id, mission_id } = req.params

    if (!user_id || !mission_id) {
        return res.status(400).json({ error: 'user_idとmission_idが必要です' })
    }

    const success = await missionModel.markMissionClearedAndReward(user_id, mission_id)
    if (success) {
        res.status(200).json({ message: 'ミッションをクリアし、ポイントを付与しました。' })
    } else {
        res.status(400).json({ error: 'ミッションクリアに失敗しました。' })
    }
})
/**
 * ミッションクリア状況確認のみ（進捗確認）
 * GET /api/missions/check-status?user_id=xxx&mission_id=xxx
 */
export const getMissionClearStatus = asyncHandler(async (req: Request, res: Response) => {
    const { user_id, mission_id } = req.query

    if (!user_id || !mission_id) {
        return res.status(400).json({ error: 'user_idとmission_idが必要です' })
    }

    const clearStatus = await missionModel.checkMissionClearStatus(String(user_id), String(mission_id))

    if (!clearStatus) {
        return res.status(404).json({ error: 'ミッションまたはユーザーが見つかりません' })
    }

    res.status(200).json(clearStatus)
})

/**
 * ミッション進捗チェック&自動クリア
 * POST /api/missions/check-progress
 * Body: { user_id: string, mission_id: string }
 */
export const checkMissionProgress = asyncHandler(async (req: Request, res: Response) => {
    const { user_id, mission_id } = req.body

    if (!user_id || !mission_id) {
        return res.status(400).json({ error: 'user_idとmission_idが必要です' })
    }

    const result = await missionModel.updateMissionProgress(user_id, mission_id)

    if (!result.updated) {
        return res.status(404).json({ error: 'ミッションまたはユーザーが見つかりません' })
    }

    if (result.cleared) {
        res.status(200).json({
            message: 'ミッションをクリアしました！報酬を獲得しました。',
            data: result.progressData,
        })
    } else {
        res.status(200).json({
            message: '進捗を更新しました。',
            data: result.progressData,
        })
    }
})

/**
 * 全ミッション一括進捗チェック
 * POST /api/missions/check-all-progress
 * Body: { user_id: string }
 */
export const checkAllMissionProgress = asyncHandler(async (req: Request, res: Response) => {
    const { user_id } = req.body

    if (!user_id) {
        return res.status(400).json({ error: 'user_idが必要です' })
    }

    const result = await missionModel.checkAndUpdateAllMissions(user_id)

    res.status(200).json({
        message: `${result.checkedCount}個のミッションをチェックしました。`,
        checkedCount: result.checkedCount,
        newlyCleared: result.newlyCleared,
        newlyClearedCount: result.newlyCleared.length,
    })
})

export const getUserMissionDetails = asyncHandler(async (req: Request, res: Response) => {
    const { user_id, category, cleared } = req.query

    if (!user_id) {
        return res.status(400).json({ error: 'user_idが必要です' })
    }

    console.log('=== getUserMissionDetails Debug ===')
    console.log('user_id:', user_id)
    console.log('category:', category)
    console.log('cleared:', cleared)

    let missions = await missionModel.getUserMissionDetails(String(user_id))

    console.log('取得されたミッション数:', missions.length)
    console.log(
        '取得されたミッション:',
        missions.map((m) => ({
            mission_id: m.mission_id,
            clear_status: m.clear_status,
            mission_category: m.mission_category,
        }))
    )

    if (category) {
        missions = missions.filter((m) => m.mission_category.toLowerCase() === String(category).toLowerCase())
        console.log('カテゴリフィルタ後:', missions.length)
    }

    // clearedパラメータの処理
    if (cleared === 'true') {
        missions = missions.filter((m) => Boolean(m.clear_status))
        console.log('cleared=true フィルタ後:', missions.length)
    } else if (cleared === 'false' || cleared === undefined) {
        // clearedパラメータがない場合は未クリアのみを返す（デフォルト動作）
        missions = missions.filter((m) => !m.clear_status)
        console.log('cleared=false フィルタ後:', missions.length)
    }
    // cleared='all'の場合は全てを返す（フィルタリングしない）

    console.log('最終結果:', missions.length)
    res.status(200).json(missions)
})

export const syncMissions = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as UserPayload)?.user_id
    if (!userId) {
        return res.status(401).json({ error: '認証が必要です' })
    }

    const now = new Date()

    // 1) 日次リセット（毎日0時以降の最初の呼び出しで実行）
    //    └ ログなどで「最後に日次リセットした日時」を保持すれば、二重実行防止も可能
    await missionModel.resetDailyMissions()

    // 2) 週次リセット（毎週月曜日0時以降の最初の呼び出しで実行）
    if (now.getDay() === 1) {
        // 0=日曜,1=月曜…
        await missionModel.resetWeeklyMissions()
    }

    // 3) 進捗チェック＆クリア
    const result = await missionModel.checkAndUpdateAllMissions(userId)

    res.status(200).json({
        message: `${result.checkedCount}件のミッションを同期しました。`,
        checkedCount: result.checkedCount,
        newlyCleared: result.newlyCleared,
        newlyClearedCount: result.newlyCleared.length,
    })
})
export const claimAllRewards = asyncHandler(async (req: Request, res: Response) => {
    const user_id = (req.user as UserPayload)?.user_id
    if (!user_id) return res.status(401).json({ error: '認証が必要です' })

    // ユーザーの報酬状況を詳しく取得
    const rewardStatus = await missionModel.getRewardStatusSummary(user_id)
    const claimableMissions = await missionModel.getUnclaimedRewards(user_id)

    // メッセージを状況に応じて生成
    let message = ''
    const details: string[] = []

    if (claimableMissions.length === 0) {
        if (rewardStatus.alreadyClaimed > 0) {
            message = '受け取れる報酬はありません。'
            details.push(`${rewardStatus.alreadyClaimed}個の報酬は既に受け取り済みです。`)
        }

        if (rewardStatus.waitingForCooldown > 0) {
            details.push(`${rewardStatus.waitingForCooldown}個の報酬は24時間のクールダウン中です。`)
        }

        if (rewardStatus.totalCleared === 0) {
            message = 'まだクリア済みのミッションがありません。'
            details.push('ミッションをクリアして報酬を獲得しましょう！')
        } else if (message === '') {
            message = '受け取れる報酬はありません。'
        }

        return res.status(200).json({
            message,
            details,
            claimed: 0,
            totalPoints: 0,
            rewardStatus,
        })
    }

    // 報酬受け取り処理
    let totalPoints = 0
    for (const m of claimableMissions) {
        totalPoints += Number(m.reward_content)
        await missionModel.markRewardReceived(user_id, m.mission_id)
    }

    await missionModel.addUserPoints(user_id, totalPoints)

    // 成功メッセージ
    const successDetails: string[] = [`${claimableMissions.length}個の報酬を受け取りました！`]

    if (rewardStatus.alreadyClaimed > 0) {
        successDetails.push(`これまでに${rewardStatus.alreadyClaimed}個の報酬を受け取り済みです。`)
    }

    if (rewardStatus.waitingForCooldown > 0) {
        successDetails.push(`あと${rewardStatus.waitingForCooldown}個の報酬が24時間後に受け取り可能になります。`)
    }

    res.status(200).json({
        message: `${totalPoints}ポイントを獲得しました！`,
        details: successDetails,
        claimed: claimableMissions.length,
        totalPoints,
        rewardStatus: {
            ...rewardStatus,
            alreadyClaimed: rewardStatus.alreadyClaimed + claimableMissions.length,
            claimable: 0,
        },
    })
})

export const getRewardStatus = asyncHandler(async (req: Request, res: Response) => {
    const user_id = (req.user as UserPayload)?.user_id
    if (!user_id) return res.status(401).json({ error: '認証が必要です' })

    const rewardStatus = await missionModel.getRewardStatusSummary(user_id)

    let message = ''
    const details: string[] = []

    if (rewardStatus.totalCleared === 0) {
        message = 'まだクリア済みのミッションがありません。'
        details.push('ミッションをクリアして報酬を獲得しましょう！')
    } else {
        message = `クリア済みミッション: ${rewardStatus.totalCleared}個`

        if (rewardStatus.claimable > 0) {
            details.push(`🎁 ${rewardStatus.claimable}個の報酬が受け取り可能です！`)
        }

        if (rewardStatus.alreadyClaimed > 0) {
            details.push(`✅ ${rewardStatus.alreadyClaimed}個の報酬は既に受け取り済みです。`)
        }

        if (rewardStatus.waitingForCooldown > 0) {
            details.push(`⏰ ${rewardStatus.waitingForCooldown}個の報酬は24時間のクールダウン中です。`)
        }
    }

    res.status(200).json({
        message,
        details,
        rewardStatus,
    })
})

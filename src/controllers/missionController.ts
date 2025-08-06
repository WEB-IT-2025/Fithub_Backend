import { Request, Response } from 'express'
import { RowDataPacket } from 'mysql2'
import db from '~/config/database'
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
            message: 'ミッションをクリアしました！報酬は翌日0時以降に受け取ることができます。',
            note: '報酬の受け取りは、翌日0時から可能です。',
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

    // 3) 進捗チェック＆クリア判定（ポイント付与は行わない）
    const result = await missionModel.checkAndUpdateAllMissions(userId)

    const message = `${result.checkedCount}件のミッションを同期しました。`
    const details: string[] = []

    if (result.newlyCleared.length > 0) {
        details.push(`🎉 ${result.newlyCleared.length}個のミッションが新たにクリアされました！`)
        details.push('報酬は翌日0時以降に「報酬受け取り」APIで受け取ることができます。')
    }

    res.status(200).json({
        message,
        details,
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

    // 受け取り可能な報酬がない場合
    if (rewardStatus.claimable === 0) {
        let message = '受け取れる報酬はありません。'
        const details: string[] = []

        if (rewardStatus.alreadyClaimed > 0) {
            details.push(`${rewardStatus.alreadyClaimed}個の報酬は既に受け取り済みです。`)
        }

        if (rewardStatus.waitingForCooldown > 0) {
            details.push(`${rewardStatus.waitingForCooldown}個の報酬は翌日0時以降まで受け取れません。`)
        }

        if (rewardStatus.totalCleared === 0) {
            message = 'まだクリア済みのミッションがありません。'
            details.push('ミッションをクリアして報酬を獲得しましょう！')
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
    const claimResult = await missionModel.claimRewards(user_id)

    // 本日受け取った日次ミッション報酬の総数を取得
    const [todayDailyRewards] = (await db.query(
        `SELECT COUNT(*) as count FROM MISSION_CLEARD mc
         JOIN MISSION m ON mc.mission_id = m.mission_id
         WHERE mc.user_id = ? 
         AND m.mission_category = 'daily'
         AND mc.clear_time >= '2099-01-01'
         AND DATE(mc.clear_time) = DATE(CONVERT_TZ(NOW(), '+00:00', '+09:00'))`,
        [user_id]
    )) as [RowDataPacket[], unknown]

    const totalDailyRewardsToday = Number(todayDailyRewards[0]?.count) || 0

    // 成功メッセージ
    const successDetails: string[] = [`${claimResult.claimedCount}個の報酬を受け取りました！`]

    // 日次ミッション報酬の総数を表示
    if (totalDailyRewardsToday > 0) {
        successDetails.push(`本日は${totalDailyRewardsToday}個の日次ミッション報酬を受け取りました！`)
    }

    // 更新された報酬状況を取得
    const updatedRewardStatus = await missionModel.getRewardStatusSummary(user_id)

    if (updatedRewardStatus.waitingForCooldown > 0) {
        successDetails.push(
            `あと${updatedRewardStatus.waitingForCooldown}個の報酬が翌日0時以降に受け取り可能になります。`
        )
    }

    res.status(200).json({
        message: `${claimResult.totalReward}ポイントを獲得しました！`,
        details: successDetails,
        claimed: claimResult.claimedCount,
        totalPoints: claimResult.totalReward,
        claimedMissions: claimResult.claimedMissions,
        rewardStatus: updatedRewardStatus,
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
            details.push(`⏰ ${rewardStatus.waitingForCooldown}個の報酬は翌日まで受け取れません。`)
        }
    }

    res.status(200).json({
        message,
        details,
        rewardStatus,
    })
})

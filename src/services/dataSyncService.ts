// src/services/dataSyncService.ts
import db from '~/config/database'
import { missionModel } from '~/models/missionModel'
import { userModel } from '~/models/userModel'

import { githubOAuthService } from './githubOAuthService'
import { googleOAuthService } from './googleOAuthService'

export interface ExerciseData {
    user_id: string
    day: string
    exercise_quantity: number
}

export interface ContributionData {
    user_id: string
    day: string
    count: number
}

export const dataSyncService = {
    // Get today's date in YYYY-MM-DD format
    getTodayDate(): string {
        return new Date().toISOString().split('T')[0]
    },

    // Get yesterday's date in YYYY-MM-DD format
    getYesterdayDate(): string {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        return yesterday.toISOString().split('T')[0]
    },

    // Sync user's Google Fit data (steps)
    async syncUserExerciseData(userId: string): Promise<ExerciseData | null> {
        try {
            const user = await userModel.findByUserId(userId)
            if (!user || !user.google_access_token) {
                console.log(`⚠️ [SYNC] No Google access token for user: ${userId}`)
                return null
            }

            // Get steps from Google Fit for today
            const steps = await googleOAuthService.getUserStepsToday(user.google_access_token)
            const today = this.getTodayDate()

            // Update or insert exercise data
            await this.updateExerciseData(userId, today, steps)

            console.log(`✅ [SYNC] Exercise data updated for ${userId}: ${steps} steps`)
            return {
                user_id: userId,
                day: today,
                exercise_quantity: steps,
            }
        } catch (error) {
            console.error(`❌ [SYNC] Failed to sync exercise data for ${userId}:`, error)
            return null
        }
    },

    // Sync user's GitHub contributions
    async syncUserContributionData(userId: string): Promise<ContributionData | null> {
        try {
            const user = await userModel.findByUserId(userId)
            if (!user || !user.github_access_token) {
                console.log(`⚠️ [SYNC] No GitHub access token for user: ${userId}`)
                return null
            }

            // Get contributions from GitHub for today
            const contributions = await githubOAuthService.getUserContributionsToday(
                user.github_access_token,
                user.github_username || ''
            )
            const today = this.getTodayDate()

            // Update or insert contribution data
            await this.updateContributionData(userId, today, contributions)

            console.log(`✅ [SYNC] Contribution data updated for ${userId}: ${contributions} contributions`)
            return {
                user_id: userId,
                day: today,
                count: contributions,
            }
        } catch (error) {
            console.error(`❌ [SYNC] Failed to sync contribution data for ${userId}:`, error)
            return null
        }
    },

    // Update exercise data (upsert)
    async updateExerciseData(userId: string, day: string, steps: number): Promise<void> {
        await db.query(
            `INSERT INTO EXERCISE (user_id, day, exercise_quantity) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE exercise_quantity = VALUES(exercise_quantity)`,
            [userId, day + ' 00:00:00', steps]
        )
    },

    // Update contribution data (upsert)
    async updateContributionData(userId: string, day: string, count: number): Promise<void> {
        await db.query(
            `INSERT INTO CONTRIBUTIONS (user_id, day, count) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE count = VALUES(count)`,
            [userId, day + ' 00:00:00', count.toString()]
        )
    },

    // Sync both exercise and contribution data for a user
    async syncUserData(
        userId: string
    ): Promise<{ exercise: ExerciseData | null; contribution: ContributionData | null }> {
        const [exercise, contribution] = await Promise.all([
            this.syncUserExerciseData(userId),
            this.syncUserContributionData(userId),
        ])

        // データ同期後にミッション進捗を自動チェック
        try {
            const missionResult = await missionModel.checkAndUpdateAllMissions(userId)
            if (missionResult.newlyCleared.length > 0) {
                console.log(`🎯 [SYNC] User ${userId} cleared missions: ${missionResult.newlyCleared.join(', ')}`)
            }
        } catch (error) {
            console.error(`❌ [SYNC] Mission check failed for user ${userId}:`, error)
        }

        return { exercise, contribution }
    },

    // Sync all active users (for cron job)
    async syncAllUsersData(): Promise<void> {
        try {
            console.log('🔄 [SYNC] Starting batch sync for all users...')

            // Get all users with valid tokens
            const users = await this.getActiveUsers()
            console.log(`📊 [SYNC] Found ${users.length} active users to sync`)

            let successCount = 0
            let errorCount = 0

            // Sync each user's data
            for (const user of users) {
                try {
                    await this.syncUserData(user.user_id)
                    successCount++
                } catch (error) {
                    console.error(`❌ [SYNC] Failed to sync user ${user.user_id}:`, error)
                    errorCount++
                }
            }

            console.log(`✅ [SYNC] Batch sync completed: ${successCount} success, ${errorCount} errors`)
        } catch (error) {
            console.error('❌ [SYNC] Batch sync failed:', error)
        }
    },

    // Get all users with valid access tokens
    async getActiveUsers(): Promise<{ user_id: string; user_name: string }[]> {
        const [rows] = await db.query(
            `SELECT user_id, user_name FROM USERS 
             WHERE (google_access_token IS NOT NULL AND google_access_token != '') 
                OR (github_access_token IS NOT NULL AND github_access_token != '')`
        )
        return rows as { user_id: string; user_name: string }[]
    },

    // Create new daily records for all users (called at midnight)
    async createDailyRecordsForAllUsers(): Promise<void> {
        try {
            console.log('🌅 [SYNC] Creating daily records for new day...')

            const users = await this.getActiveUsers()
            const today = this.getTodayDate()

            let createdExercise = 0
            let createdContribution = 0

            for (const user of users) {
                try {
                    // Create exercise record with 0 initial steps
                    await db.query(`INSERT IGNORE INTO EXERCISE (user_id, day, exercise_quantity) VALUES (?, ?, 0)`, [
                        user.user_id,
                        today + ' 00:00:00',
                    ])
                    createdExercise++

                    // Create contribution record with 0 initial count
                    await db.query(`INSERT IGNORE INTO CONTRIBUTIONS (user_id, day, count) VALUES (?, ?, '0')`, [
                        user.user_id,
                        today + ' 00:00:00',
                    ])
                    createdContribution++
                } catch (error) {
                    console.error(`❌ [SYNC] Failed to create daily records for ${user.user_id}:`, error)
                }
            }

            console.log(
                `✅ [SYNC] Daily records created: ${createdExercise} exercise, ${createdContribution} contribution`
            )

            // 日次記録作成後に包括的なミッション管理を実行
            await this.performDailyMissionMaintenance()
        } catch (error) {
            console.error('❌ [SYNC] Failed to create daily records:', error)
        }
    },

    // 日次ミッション管理（リセット＋全ユーザーの進捗チェック）
    async performDailyMissionMaintenance(): Promise<void> {
        try {
            console.log('🎯 [MISSION] Starting daily mission maintenance...')

            // 1. デイリーミッションリセット
            await missionModel.resetDailyMissions()
            console.log('✅ [MISSION] Daily missions reset completed')

            // 2. 月曜日の場合はウィークリーミッションもリセット
            const today = new Date()
            if (today.getDay() === 1) {
                // 月曜日
                await missionModel.resetWeeklyMissions()
                console.log('✅ [MISSION] Weekly missions reset completed')
            }

            // 3. 全ユーザーのミッション進捗を一括チェック
            const users = await this.getActiveUsers()
            let totalChecked = 0
            let totalCleared = 0

            for (const user of users) {
                try {
                    const result = await missionModel.checkAndUpdateAllMissions(user.user_id)
                    totalChecked += result.checkedCount
                    totalCleared += result.newlyCleared.length

                    if (result.newlyCleared.length > 0) {
                        console.log(`🎯 [MISSION] User ${user.user_id} cleared: ${result.newlyCleared.join(', ')}`)
                    }
                } catch (error) {
                    console.error(`❌ [MISSION] Failed to check missions for user ${user.user_id}:`, error)
                }
            }

            console.log(
                `✅ [MISSION] Daily maintenance completed: ${totalChecked} checked, ${totalCleared} newly cleared`
            )
        } catch (error) {
            console.error('❌ [MISSION] Daily mission maintenance failed:', error)
        }
    },

    // Get weekly steps from database (last 7 days including today)
    async getWeeklyStepsFromDatabase(userId: string): Promise<{ date: string; steps: number }[]> {
        try {
            const [rows] = await db.query(
                `SELECT day, exercise_quantity as steps 
                 FROM EXERCISE 
                 WHERE user_id = ? 
                   AND day >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
                   AND day <= CURDATE()
                 ORDER BY day ASC`,
                [userId]
            )

            const weeklyData = (rows as { day: Date; steps: number }[]).map((row) => ({
                date: row.day.toISOString().split('T')[0],
                steps: row.steps,
            }))

            return weeklyData
        } catch (error) {
            console.error(`Failed to get weekly steps from database for ${userId}:`, error)
            return []
        }
    },

    // Get weekly contributions from database (last 7 days including today)
    async getWeeklyContributionsFromDatabase(userId: string): Promise<{ date: string; contributions: number }[]> {
        try {
            const [rows] = await db.query(
                `SELECT day, count as contributions 
                 FROM CONTRIBUTIONS 
                 WHERE user_id = ? 
                   AND day >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
                   AND day <= CURDATE()
                 ORDER BY day ASC`,
                [userId]
            )

            const weeklyData = (rows as { day: Date; contributions: string }[]).map((row) => ({
                date: row.day.toISOString().split('T')[0],
                contributions: parseInt(row.contributions) || 0,
            }))

            return weeklyData
        } catch (error) {
            console.error(`Failed to get weekly contributions from database for ${userId}:`, error)
            return []
        }
    },

    // Get monthly steps from database (last 30 days including today)
    async getMonthlyStepsFromDatabase(
        userId: string
    ): Promise<{ total: number; daily: { date: string; steps: number }[] }> {
        try {
            const [rows] = await db.query(
                `SELECT day, exercise_quantity as steps 
                 FROM EXERCISE 
                 WHERE user_id = ? 
                   AND day >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
                   AND day <= CURDATE()
                 ORDER BY day ASC`,
                [userId]
            )

            const dailyData = (rows as { day: Date; steps: number }[]).map((row) => ({
                date: row.day.toISOString().split('T')[0],
                steps: row.steps,
            }))

            const total = dailyData.reduce((sum, day) => sum + day.steps, 0)

            return { total, daily: dailyData }
        } catch (error) {
            console.error(`Failed to get monthly steps from database for ${userId}:`, error)
            return { total: 0, daily: [] }
        }
    },

    // Get monthly contributions from database (last 30 days including today)
    async getMonthlyContributionsFromDatabase(
        userId: string
    ): Promise<{ total: number; daily: { date: string; contributions: number }[] }> {
        try {
            const [rows] = await db.query(
                `SELECT day, count as contributions 
                 FROM CONTRIBUTIONS 
                 WHERE user_id = ? 
                   AND day >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
                   AND day <= CURDATE()
                 ORDER BY day ASC`,
                [userId]
            )

            const dailyData = (rows as { day: Date; contributions: string }[]).map((row) => ({
                date: row.day.toISOString().split('T')[0],
                contributions: parseInt(row.contributions) || 0,
            }))

            const total = dailyData.reduce((sum, day) => sum + day.contributions, 0)

            return { total, daily: dailyData }
        } catch (error) {
            console.error(`Failed to get monthly contributions from database for ${userId}:`, error)
            return { total: 0, daily: [] }
        }
    },
}

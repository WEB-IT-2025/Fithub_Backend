// src/services/dataSyncService.ts
import db from '~/config/database'
import { missionModel } from '~/models/missionModel'
import { userModel } from '~/models/userModel'

import { githubOAuthService } from './githubOAuthService'
import { googleOAuthService } from './googleOAuthService'

export interface ExerciseDateData {
    user_id: string
    timestamp: string
    steps: number
}

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
    // Get today's date in YYYY-MM-DD format (Japan timezone)
    getTodayDate(): string {
        return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
    },

    // Get yesterday's date in YYYY-MM-DD format (Japan timezone)
    getYesterdayDate(): string {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        return yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
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

    // Update hourly exercise data for today (upsert into EXERCISE_DATE)
    async updateHourlyExerciseData(userId: string, timestamp: string, steps: number): Promise<void> {
        await db.query(
            `INSERT INTO EXERCISE_DATE (user_id, timestamp, steps) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE steps = VALUES(steps)`,
            [userId, timestamp, steps]
        )
    },

    // Sync user's hourly Google Fit data (enhanced with detailed data)
    async syncUserHourlyExerciseData(userId: string): Promise<ExerciseDateData[]> {
        try {
            const user = await userModel.findByUserId(userId)
            if (!user || !user.google_access_token) {
                console.log(`⚠️ [HOURLY] No Google access token for user: ${userId}`)
                return []
            }

            // Get both hourly and detailed data for better accuracy
            const [hourlySteps, detailedSteps] = await Promise.all([
                googleOAuthService.getUserStepsTodayByHours(user.google_access_token),
                googleOAuthService.getUserDetailedStepsToday(user.google_access_token),
            ])

            console.log(
                `📊 [HOURLY] Retrieved ${hourlySteps.length} hourly entries, ${detailedSteps.length} detailed entries for user: ${userId}`
            )

            if (hourlySteps.length === 0) {
                console.log(`⚠️ [HOURLY] No hourly data available for user: ${userId}`)
                return []
            }

            // Use detailed data to fill in missing steps if available
            const enhancedHourlyData = this.enhanceHourlyDataWithDetails(hourlySteps, detailedSteps)
            const syncedData: ExerciseDateData[] = []

            // Update database with each enhanced hourly data point
            for (const hourData of enhancedHourlyData) {
                await this.updateHourlyExerciseData(userId, hourData.timestamp, hourData.steps)
                syncedData.push({
                    user_id: userId,
                    timestamp: hourData.timestamp,
                    steps: hourData.steps,
                })
            }

            console.log(
                `✅ [HOURLY] Enhanced hourly exercise data updated for ${userId}: ${enhancedHourlyData.length} entries`
            )
            return syncedData
        } catch (error) {
            console.error(`❌ [HOURLY] Failed to sync hourly exercise data for ${userId}:`, error)
            return []
        }
    },

    // Enhance hourly data with detailed step information
    enhanceHourlyDataWithDetails(
        hourlyData: { timestamp: string; steps: number }[],
        detailedData: { timestamp: string; steps: number }[]
    ): { timestamp: string; steps: number }[] {
        const enhanced = [...hourlyData]

        // Create a map of hourly data for easy lookup
        const hourlyMap = new Map<string, number>()
        hourlyData.forEach((data) => {
            const hour = new Date(data.timestamp).getHours()
            const key = `${new Date(data.timestamp).toLocaleDateString('en-CA')}-${hour}`
            hourlyMap.set(key, data.steps)
        })

        // Aggregate detailed data by hour and add missing steps
        const detailedByHour = new Map<string, number>()
        detailedData.forEach((data) => {
            const date = new Date(data.timestamp)
            const hour = date.getHours()
            const key = `${date.toLocaleDateString('en-CA')}-${hour}`
            detailedByHour.set(key, (detailedByHour.get(key) || 0) + data.steps)
        })

        // Update enhanced data with more accurate detailed information
        enhanced.forEach((hourData) => {
            const hour = new Date(hourData.timestamp).getHours()
            const key = `${new Date(hourData.timestamp).toLocaleDateString('en-CA')}-${hour}`
            const detailedSteps = detailedByHour.get(key)

            if (detailedSteps && detailedSteps > hourData.steps) {
                hourData.steps = detailedSteps
                console.log(`📊 [ENHANCE] Updated ${hour}:00 from ${hourData.steps} to ${detailedSteps} steps`)
            }
        })

        return enhanced
    },

    // Clear previous day's EXERCISE_DATE data (called at midnight)
    async clearPreviousDayHourlyData(): Promise<void> {
        try {
            const yesterday = this.getYesterdayDate()

            // Delete all records from yesterday
            const [result] = await db.query(
                `DELETE FROM EXERCISE_DATE 
                 WHERE DATE(timestamp) = ?`,
                [yesterday]
            )

            const affectedRows = (result as { affectedRows: number }).affectedRows
            console.log(`🧹 [CLEANUP] Cleared ${affectedRows} hourly records from ${yesterday}`)
        } catch (error) {
            console.error('❌ [CLEANUP] Failed to clear previous day hourly data:', error)
        }
    },

    // Clear all EXERCISE_DATE data (for cleanup)
    async clearAllHourlyData(): Promise<void> {
        try {
            // Temporarily disable safe updates for this operation
            await db.query('SET SQL_SAFE_UPDATES = 0')
            const [result] = await db.query(`DELETE FROM EXERCISE_DATE`)
            await db.query('SET SQL_SAFE_UPDATES = 1')

            const affectedRows = (result as { affectedRows: number }).affectedRows
            console.log(`🧹 [CLEANUP] Cleared all ${affectedRows} hourly records from EXERCISE_DATE table`)
        } catch (error) {
            // Ensure safe updates is re-enabled even if there's an error
            try {
                await db.query('SET SQL_SAFE_UPDATES = 1')
            } catch (e) {
                console.error('Failed to re-enable SQL_SAFE_UPDATES:', e)
            }
            console.error('❌ [CLEANUP] Failed to clear all hourly data:', error)
        }
    },

    // Clear specific user's EXERCISE_DATE data
    async clearUserHourlyData(userId: string): Promise<void> {
        try {
            // Delete all records for specific user from EXERCISE_DATE table
            const [result] = await db.query(`DELETE FROM EXERCISE_DATE WHERE user_id = ?`, [userId])

            const affectedRows = (result as { affectedRows: number }).affectedRows
            console.log(`🧹 [CLEANUP] Cleared ${affectedRows} hourly records for user ${userId}`)
        } catch (error) {
            console.error(`❌ [CLEANUP] Failed to clear hourly data for user ${userId}:`, error)
        }
    },

    // Clear outdated EXERCISE_DATE data (older than specified days)
    async clearOutdatedHourlyData(daysToKeep: number = 1): Promise<void> {
        try {
            // Temporarily disable safe updates for this operation
            await db.query('SET SQL_SAFE_UPDATES = 0')
            const [result] = await db.query(
                `DELETE FROM EXERCISE_DATE 
                 WHERE DATE(timestamp) < DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
                [daysToKeep]
            )
            await db.query('SET SQL_SAFE_UPDATES = 1')

            const affectedRows = (result as { affectedRows: number }).affectedRows
            console.log(`🧹 [CLEANUP] Cleared ${affectedRows} outdated hourly records (older than ${daysToKeep} days)`)
        } catch (error) {
            // Ensure safe updates is re-enabled even if there's an error
            try {
                await db.query('SET SQL_SAFE_UPDATES = 1')
            } catch (e) {
                console.error('Failed to re-enable SQL_SAFE_UPDATES:', e)
            }
            console.error(`❌ [CLEANUP] Failed to clear outdated hourly data:`, error)
        }
    },

    // Clear odd hour data (1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23)
    async clearOddHourData(): Promise<void> {
        try {
            // Temporarily disable safe updates for this operation
            await db.query('SET SQL_SAFE_UPDATES = 0')
            const [result] = await db.query(
                `DELETE FROM EXERCISE_DATE 
                 WHERE HOUR(timestamp) IN (1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23)`
            )
            await db.query('SET SQL_SAFE_UPDATES = 1')

            const affectedRows = (result as { affectedRows: number }).affectedRows
            console.log(`🧹 [CLEANUP] Cleared ${affectedRows} odd hour records (keeping only even hours)`)
        } catch (error) {
            // Ensure safe updates is re-enabled even if there's an error
            try {
                await db.query('SET SQL_SAFE_UPDATES = 1')
            } catch (e) {
                console.error('Failed to re-enable SQL_SAFE_UPDATES:', e)
            }
            console.error(`❌ [CLEANUP] Failed to clear odd hour data:`, error)
        }
    },

    // Clear hourly data for a specific date (e.g., '2025-08-14')
    async clearSpecificDateData(targetDate: string): Promise<void> {
        try {
            // Temporarily disable safe updates for this operation
            await db.query('SET SQL_SAFE_UPDATES = 0')
            const [result] = await db.query(
                `DELETE FROM EXERCISE_DATE 
                 WHERE DATE(timestamp) = ?`,
                [targetDate]
            )
            await db.query('SET SQL_SAFE_UPDATES = 1')

            const affectedRows = (result as { affectedRows: number }).affectedRows
            console.log(`🧹 [CLEANUP] Cleared ${affectedRows} records for date: ${targetDate}`)
        } catch (error) {
            // Ensure safe updates is re-enabled even if there's an error
            try {
                await db.query('SET SQL_SAFE_UPDATES = 1')
            } catch (e) {
                console.error('Failed to re-enable SQL_SAFE_UPDATES:', e)
            }
            console.error(`❌ [CLEANUP] Failed to clear data for date ${targetDate}:`, error)
        }
    },

    // Get today's hourly exercise data from database
    async getTodayHourlyStepsFromDatabase(userId: string): Promise<{ timestamp: string; steps: number }[]> {
        try {
            const today = this.getTodayDate()

            const [rows] = await db.query(
                `SELECT timestamp, steps 
                 FROM EXERCISE_DATE 
                 WHERE user_id = ? 
                   AND DATE(timestamp) = ?
                 ORDER BY timestamp ASC`,
                [userId, today]
            )

            const hourlyData = (rows as { timestamp: Date; steps: number }[]).map((row) => ({
                timestamp: row.timestamp.toISOString().replace('T', ' ').substring(0, 19),
                steps: row.steps,
            }))

            return hourlyData
        } catch (error) {
            console.error(`Failed to get today's hourly steps from database for ${userId}:`, error)
            return []
        }
    },

    // Sync hourly data for all active users (for cron job)
    async syncAllUsersHourlyData(): Promise<void> {
        try {
            console.log('🔄 [HOURLY] Starting hourly sync for all users...')

            // Get all users with valid Google tokens
            const users = await this.getActiveUsers()
            const activeGoogleUsers = []

            // Filter users with Google access tokens
            for (const user of users) {
                const userDetails = await userModel.findByUserId(user.user_id)
                if (userDetails && userDetails.google_access_token) {
                    activeGoogleUsers.push(user)
                }
            }

            console.log(`📊 [HOURLY] Found ${activeGoogleUsers.length} users with Google access`)

            let successCount = 0
            let errorCount = 0

            // Sync each user's hourly data
            for (const user of activeGoogleUsers) {
                try {
                    const syncedData = await this.syncUserHourlyExerciseData(user.user_id)
                    if (syncedData.length > 0) {
                        successCount++
                    }
                } catch (error) {
                    console.error(`❌ [HOURLY] Failed to sync hourly data for user ${user.user_id}:`, error)
                    errorCount++
                }
            }

            console.log(`✅ [HOURLY] Hourly sync completed: ${successCount} success, ${errorCount} errors`)
        } catch (error) {
            console.error('❌ [HOURLY] Hourly batch sync failed:', error)
        }
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

            // First, clear previous day's hourly data to avoid database bloat
            await this.clearPreviousDayHourlyData()

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

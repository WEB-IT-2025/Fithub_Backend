// src/services/dataSyncService.ts
import db from '~/config/database'
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
        } catch (error) {
            console.error('❌ [SYNC] Failed to create daily records:', error)
        }
    },
}

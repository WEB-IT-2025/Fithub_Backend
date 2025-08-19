// src/services/cronJobService.ts
import cron from 'node-cron'
import db from '~/config/database'
import { userModel } from '~/models/userModel'

import { dataSyncService } from './dataSyncService'
import { googleOAuthService } from './googleOAuthService'

export const cronJobService = {
    // Start all cron jobs
    startAllJobs(): void {
        this.startDataSyncJob()
        this.startHourlySyncJob()
        this.startDailyRecordCreationJob()
        this.startDailyCleanupJob()
        this.startTokenRefreshJob()
        console.log('🕐 [CRON] All cron jobs started successfully')
    },

    // Sync user data every 15 minutes
    startDataSyncJob(): void {
        // Run every 15 minutes: 0,15,30,45 minutes of every hour
        cron.schedule(
            '0,15,30,45 * * * *',
            async () => {
                console.log('🔄 [CRON] Starting 15-minute data sync...')
                await dataSyncService.syncAllUsersData()
            },
            {
                scheduled: true,
                timezone: 'Asia/Tokyo', // Adjust timezone as needed
            }
        )

        console.log('🕐 [CRON] Data sync job started (every 15 minutes)')
    },

    // Sync 2-hourly exercise data every 2 hours
    startHourlySyncJob(): void {
        // Run every 2 hours at 5 minutes past even hours (0:05, 2:05, 4:05, etc.)
        cron.schedule(
            '5 */2 * * *',
            async () => {
                console.log('📊 [CRON] Starting 2-hourly exercise data sync...')
                await dataSyncService.syncAllUsersHourlyData()
            },
            {
                scheduled: true,
                timezone: 'Asia/Tokyo',
            }
        )

        console.log('🕐 [CRON] 2-hourly exercise sync job started (every 2 hours)')
    },

    // Create daily records at midnight
    startDailyRecordCreationJob(): void {
        // Run every day at 00:01 AM
        cron.schedule(
            '1 0 * * *',
            async () => {
                console.log('🌅 [CRON] Creating daily records for new day...')
                await dataSyncService.createDailyRecordsForAllUsers()
            },
            {
                scheduled: true,
                timezone: 'Asia/Tokyo',
            }
        )

        console.log('🕐 [CRON] Daily record creation job started (daily at 00:01)')
    },

    // Daily cleanup job - clear previous day's data and odd hours
    startDailyCleanupJob(): void {
        // Run every day at 00:05 AM (after daily record creation)
        cron.schedule(
            '5 0 * * *',
            async () => {
                console.log('🧹 [CRON] Starting daily cleanup...')
                try {
                    // Clear outdated hourly data (keep only today's data)
                    await dataSyncService.clearOutdatedHourlyData(0) // Keep 0 days = only today

                    // Clear odd hour data to ensure only even hours remain
                    await dataSyncService.clearOddHourData()

                    console.log('✅ [CRON] Daily cleanup completed successfully')
                } catch (error) {
                    console.error('❌ [CRON] Daily cleanup failed:', error)
                }
            },
            {
                scheduled: true,
                timezone: 'Asia/Tokyo',
            }
        )

        console.log('🕐 [CRON] Daily cleanup job started (daily at 00:05)')
    },

    // Refresh Google tokens every 30 minutes (existing job)
    startTokenRefreshJob(): void {
        // Run every 30 minutes
        cron.schedule(
            '*/30 * * * *',
            async () => {
                await this.refreshExpiredGoogleTokens()
            },
            {
                scheduled: true,
                timezone: 'Asia/Tokyo',
            }
        )

        console.log('🕐 [CRON] Google token refresh job started (every 30 minutes)')
    },

    // Refresh expired Google tokens
    async refreshExpiredGoogleTokens(): Promise<void> {
        try {
            // Get users whose tokens expire within the next 10 minutes
            const expiringUsers = await this.getUsersWithExpiringTokens()

            if (expiringUsers.length === 0) {
                return
            }

            console.log(`🔄 [CRON] Refreshing tokens for ${expiringUsers.length} users`)

            let successCount = 0
            let errorCount = 0

            for (const user of expiringUsers) {
                try {
                    if (user.google_refresh_token) {
                        const newTokens = await googleOAuthService.refreshAccessToken(user.google_refresh_token)

                        await userModel.updateGoogleOAuthTokens(user.user_id, {
                            access_token: newTokens.access_token,
                            refresh_token: newTokens.refresh_token || user.google_refresh_token,
                            expires_in: newTokens.expires_in,
                        })

                        successCount++
                    }
                } catch (error) {
                    console.error(`❌ [CRON] Failed to refresh token for user ${user.user_id}:`, error)
                    errorCount++
                }
            }

            console.log(`✅ [CRON] Token refresh completed: ${successCount} success, ${errorCount} errors`)
        } catch (error) {
            console.error('❌ [CRON] Token refresh job failed:', error)
        }
    },

    // Get users with tokens expiring soon
    async getUsersWithExpiringTokens(): Promise<
        Array<{
            user_id: string
            user_name: string
            google_refresh_token: string
        }>
    > {
        const [rows] = await db.query(
            `SELECT user_id, user_name, google_refresh_token 
             FROM USERS 
             WHERE google_token_expires_at <= DATE_ADD(NOW(), INTERVAL 35 MINUTE)
               AND google_refresh_token IS NOT NULL 
               AND google_refresh_token != ''`
        )
        return rows as Array<{
            user_id: string
            user_name: string
            google_refresh_token: string
        }>
    },
}

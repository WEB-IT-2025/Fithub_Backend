// src/services/googleTokenRefreshService.ts
import { RowDataPacket } from 'mysql2'
import cron from 'node-cron'
import db from '~/config/database'
import { userModel } from '~/models/userModel'

interface UserWithToken extends RowDataPacket {
    user_id: string
    user_name: string
    email: string
    google_refresh_token: string
    google_token_expires_at: Date
}

class GoogleTokenRefreshService {
    private readonly REFRESH_BUFFER_MINUTES = 10
    private isJobRunning = false

    startCronJob() {
        cron.schedule(
            '*/30 * * * *',
            () => {
                this.refreshExpiredTokens()
            },
            {
                scheduled: true,
                timezone: 'Asia/Ho_Chi_Minh',
            }
        )

        console.log('🕐 [CRON] Google token refresh job started (every 30 minutes)')
    }

    private async refreshExpiredTokens() {
        if (this.isJobRunning) {
            console.log('⏳ [CRON] Token refresh job already running, skipping...')
            return
        }

        this.isJobRunning = true

        try {
            console.log('🔄 [CRON] Starting Google token refresh check...')

            const bufferMs = this.REFRESH_BUFFER_MINUTES * 60 * 1000
            const checkTime = new Date(Date.now() + bufferMs)

            const [rows] = await db.query<UserWithToken[]>(
                `SELECT user_id, user_name, email, google_refresh_token, google_token_expires_at 
                 FROM USERS 
                 WHERE google_refresh_token IS NOT NULL 
                 AND google_refresh_token != '' 
                 AND google_token_expires_at <= ?
                 ORDER BY google_token_expires_at ASC`,
                [checkTime]
            )

            if (rows.length === 0) {
                console.log('✅ [CRON] No tokens need refreshing')
                return
            }

            console.log(`🔍 [CRON] Found ${rows.length} users with tokens needing refresh:`)

            let successCount = 0
            let failureCount = 0

            for (const user of rows) {
                try {
                    const minutesUntilExpiry = Math.floor((user.google_token_expires_at.getTime() - Date.now()) / 60000)

                    console.log(
                        `🔄 [CRON] Refreshing token for user ${user.user_name} (${user.user_id}), expires in ${minutesUntilExpiry} minutes`
                    )

                    const newTokens = await this.refreshAccessToken(user.google_refresh_token)

                    await userModel.updateGoogleOAuthTokens(user.user_id, newTokens)

                    successCount++
                    console.log(`✅ [CRON] Token refreshed for ${user.user_name}`)
                } catch (error) {
                    failureCount++
                    console.error(`❌ [CRON] Failed to refresh token for ${user.user_name}:`, {
                        user_id: user.user_id,
                        error: error instanceof Error ? error.message : String(error),
                    })
                }

                await new Promise((resolve) => setTimeout(resolve, 100))
            }

            console.log(`🎉 [CRON] Token refresh completed: ${successCount} success, ${failureCount} failures`)
        } catch (error) {
            console.error('❌ [CRON] Token refresh job failed:', error)
        } finally {
            this.isJobRunning = false
        }
    }

    /**
     * Manually refresh tokens for all users (for testing or maintenance)
     */
    async refreshAllTokens(): Promise<{
        total: number
        success: number
        failures: number
        duration: number
    }> {
        const startTime = Date.now()
        console.log('🔄 [MANUAL] Starting manual token refresh for all users...')

        const [rows] = await db.query<UserWithToken[]>(
            `SELECT user_id, user_name, email, google_refresh_token, google_token_expires_at 
             FROM USERS 
             WHERE google_refresh_token IS NOT NULL 
             AND google_refresh_token != ''`
        )

        let successCount = 0
        let failureCount = 0

        for (const user of rows) {
            try {
                const newTokens = await this.refreshAccessToken(user.google_refresh_token)
                await userModel.updateGoogleOAuthTokens(user.user_id, newTokens)
                successCount++
            } catch (error) {
                failureCount++
                console.error(`❌ [MANUAL] Failed to refresh token for ${user.user_name}:`, error)
            }
        }

        const duration = Date.now() - startTime
        console.log(`🎉 [MANUAL] Manual refresh completed: ${successCount}/${rows.length} success (${duration}ms)`)

        return {
            total: rows.length,
            success: successCount,
            failures: failureCount,
            duration,
        }
    }

    /**
     * Get token expiry status for all users (for monitoring/debugging)
     */
    async getTokenExpiryReport(): Promise<{
        total_users: number
        expired: number
        expiring_soon: number
        healthy: number
        users: Array<{
            user_id: string
            user_name: string
            expires_at: Date
            expires_in_minutes: number
            status: 'expired' | 'expiring_soon' | 'healthy'
        }>
    }> {
        const [rows] = await db.query<UserWithToken[]>(
            `SELECT user_id, user_name, email, google_token_expires_at 
             FROM USERS 
             WHERE google_refresh_token IS NOT NULL 
             AND google_refresh_token != ''
             ORDER BY google_token_expires_at ASC`
        )

        const now = Date.now()
        const bufferMs = this.REFRESH_BUFFER_MINUTES * 60 * 1000

        let expired = 0
        let expiring_soon = 0
        let healthy = 0

        const users = rows.map((user) => {
            const expiresInMs = user.google_token_expires_at.getTime() - now
            const expiresInMinutes = Math.floor(expiresInMs / 60000)

            let status: 'expired' | 'expiring_soon' | 'healthy'
            if (expiresInMs <= 0) {
                status = 'expired'
                expired++
            } else if (expiresInMs <= bufferMs) {
                status = 'expiring_soon'
                expiring_soon++
            } else {
                status = 'healthy'
                healthy++
            }

            return {
                user_id: user.user_id,
                user_name: user.user_name,
                expires_at: user.google_token_expires_at,
                expires_in_minutes: expiresInMinutes,
                status,
            }
        })

        return {
            total_users: rows.length,
            expired,
            expiring_soon,
            healthy,
            users,
        }
    }

    /**
     * Refresh Google access token using refresh token
     */
    private async refreshAccessToken(refreshToken: string) {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }),
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Google token refresh failed: ${response.status} ${errorText}`)
        }

        const data = await response.json()

        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token || refreshToken, // Keep old refresh token if new one not provided
            expires_in: data.expires_in || 3600, // Default to 1 hour
        }
    }
}

export const googleTokenRefreshService = new GoogleTokenRefreshService()

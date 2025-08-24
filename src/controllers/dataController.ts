// src/controllers/dataController.ts
import { Request, Response } from 'express'
import { RowDataPacket } from 'mysql2'
import db from '~/config/database'
import { AuthenticatedRequest } from '~/middlewares/authMiddleware'
import { dataSyncService } from '~/services/dataSyncService'

// POST /api/data/sync - Manual sync user data (includes hourly data)
export const syncUserDataManually = async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest
        const userId = authReq.user?.user_id
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            })
        }

        console.log(`🔄 [SYNC] Manual sync requested for user: ${userId}`)

        // Sync both regular data and hourly data in parallel
        const [syncResult, hourlySyncResult] = await Promise.all([
            dataSyncService.syncUserData(userId),
            dataSyncService.syncUserHourlyExerciseData(userId),
        ])

        const response = {
            success: true,
            message: 'Data synced successfully (including hourly data)',
            data: {
                user_id: userId,
                synced_at: new Date().toISOString(),
                exercise_data: syncResult.exercise,
                contribution_data: syncResult.contribution,
                hourly_data: {
                    entries: hourlySyncResult.length,
                    data: hourlySyncResult,
                },
            },
        }

        console.log(`✅ [SYNC] Manual sync completed for user: ${userId} (${hourlySyncResult.length} hourly entries)`)
        res.json(response)
    } catch (error) {
        console.error('❌ [SYNC] Manual sync failed:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to sync user data',
            error: error instanceof Error ? error.message : 'Unknown error',
        })
    }
}

// GET /api/data/hourly - Get user's hourly exercise data for today
export const getUserHourlyData = async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId
        if (!userId || userId.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Invalid user_id parameter',
            })
        }

        // Get today's hourly data from database
        const hourlyData = await dataSyncService.getTodayHourlyStepsFromDatabase(userId)

        // Calculate cumulative steps for charting with user-friendly time format
        let cumulativeSteps = 0
        const chartData = hourlyData.map((data) => {
            cumulativeSteps += data.steps
            // Parse as Japan time since timestamp is already in JST format
            const hour = parseInt(data.timestamp.split(' ')[1].split(':')[0])
            return {
                time: `${hour.toString().padStart(2, '0')}:00`, // User-friendly format (00:00, 02:00, etc.)
                timeValue: hour, // Numeric value for chart libraries
                steps: data.steps,
                totalSteps: cumulativeSteps,
                timestamp: data.timestamp,
            }
        })

        const response = {
            success: true,
            data: {
                user_id: userId,
                date: dataSyncService.getTodayDate(),
                hourly_data: chartData,
                total_steps: cumulativeSteps,
                data_points: hourlyData.length,
                time_range:
                    '2-hour intervals: 00:00, 02:00, 04:00, 06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00',
                last_updated: new Date().toISOString(),
            },
        }

        res.json(response)
    } catch (error) {
        console.error('❌ [DATA] Failed to get hourly data:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve hourly data',
        })
    }
}

// DELETE /api/data/cleanup - Clear all hourly data (admin only)
export const clearAllHourlyData = async (req: Request, res: Response) => {
    try {
        console.log('🧹 [ADMIN] Clear all hourly data requested')

        // Clear all hourly data
        await dataSyncService.clearAllHourlyData()

        const response = {
            success: true,
            message: 'All hourly data cleared successfully',
            cleared_at: new Date().toISOString(),
        }

        console.log('✅ [ADMIN] All hourly data cleared')
        res.json(response)
    } catch (error) {
        console.error('❌ [ADMIN] Failed to clear all hourly data:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to clear hourly data',
            error: error instanceof Error ? error.message : 'Unknown error',
        })
    }
}

// DELETE /api/data/cleanup/user/:userId - Clear specific user's hourly data (admin only)
export const clearUserHourlyData = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required',
            })
        }

        console.log(`🧹 [ADMIN] Clear hourly data requested for user: ${userId}`)

        // Clear specific user's hourly data
        await dataSyncService.clearUserHourlyData(userId)

        const response = {
            success: true,
            message: `Hourly data cleared for user ${userId}`,
            user_id: userId,
            cleared_at: new Date().toISOString(),
        }

        console.log(`✅ [ADMIN] Hourly data cleared for user: ${userId}`)
        res.json(response)
    } catch (error) {
        console.error('❌ [ADMIN] Failed to clear user hourly data:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to clear user hourly data',
            error: error instanceof Error ? error.message : 'Unknown error',
        })
    }
}

// DELETE /api/data/cleanup/outdated - Clear outdated hourly data (admin only)
export const clearOutdatedHourlyData = async (req: Request, res: Response) => {
    try {
        const { days } = req.query
        const daysToKeep = days ? parseInt(days as string) : 1

        console.log(`🧹 [ADMIN] Clear outdated hourly data requested (keep ${daysToKeep} days)`)

        // Clear outdated hourly data
        await dataSyncService.clearOutdatedHourlyData(daysToKeep)

        const response = {
            success: true,
            message: `Outdated hourly data cleared (kept ${daysToKeep} days)`,
            days_kept: daysToKeep,
            cleared_at: new Date().toISOString(),
        }

        console.log(`✅ [ADMIN] Outdated hourly data cleared (kept ${daysToKeep} days)`)
        res.json(response)
    } catch (error) {
        console.error('❌ [ADMIN] Failed to clear outdated hourly data:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to clear outdated hourly data',
            error: error instanceof Error ? error.message : 'Unknown error',
        })
    }
}

// DELETE /api/data/cleanup/odd-hours - Clear odd hour data (admin only)
export const clearOddHourData = async (req: Request, res: Response) => {
    try {
        console.log('🧹 [ADMIN] Clear odd hour data requested')

        // Clear odd hour data (1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23)
        await dataSyncService.clearOddHourData()

        const response = {
            success: true,
            message:
                'Odd hour data cleared successfully (keeping only even hours: 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22)',
            cleared_hours: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23],
            cleared_at: new Date().toISOString(),
        }

        console.log('✅ [ADMIN] Odd hour data cleared')
        res.json(response)
    } catch (error) {
        console.error('❌ [ADMIN] Failed to clear odd hour data:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to clear odd hour data',
            error: error instanceof Error ? error.message : 'Unknown error',
        })
    }
}

// DELETE /api/data/cleanup/date/:date - Clear specific date data (admin only)
export const clearSpecificDateData = async (req: Request, res: Response) => {
    try {
        const { date } = req.params

        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Date is required (format: YYYY-MM-DD)',
            })
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD format (e.g., 2025-08-14)',
            })
        }

        console.log(`🧹 [ADMIN] Clear specific date data requested for: ${date}`)

        // Clear specific date data
        await dataSyncService.clearSpecificDateData(date)

        const response = {
            success: true,
            message: `Data cleared for date: ${date}`,
            target_date: date,
            cleared_at: new Date().toISOString(),
        }

        console.log(`✅ [ADMIN] Data cleared for date: ${date}`)
        res.json(response)
    } catch (error) {
        console.error('❌ [ADMIN] Failed to clear specific date data:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to clear specific date data',
            error: error instanceof Error ? error.message : 'Unknown error',
        })
    }
}

// POST /api/data/test/sync-all-hourly - Manually trigger hourly sync for all users (admin only)
export const testSyncAllUsersHourly = async (req: Request, res: Response) => {
    try {
        console.log('🧪 [TEST] Manual hourly sync for all users requested')

        // Trigger hourly sync for all users
        await dataSyncService.syncAllUsersHourlyData()

        const response = {
            success: true,
            message: 'Hourly sync triggered for all users (test)',
            triggered_at: new Date().toISOString(),
        }

        console.log('✅ [TEST] Manual hourly sync for all users completed')
        res.json(response)
    } catch (error) {
        console.error('❌ [TEST] Failed to trigger hourly sync for all users:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to trigger hourly sync for all users',
            error: error instanceof Error ? error.message : 'Unknown error',
        })
    }
}

// POST /api/data/test/cleanup-yesterday - Test: manually run daily cleanup (admin only)
export const testDailyCleanup = async (req: Request, res: Response) => {
    try {
        console.log('🧪 [TEST] Manual daily cleanup requested')

        // Clear outdated hourly data (keep only today's data)
        await dataSyncService.clearOutdatedHourlyData(0) // Keep 0 days = only today

        // Clear odd hour data to ensure only even hours remain
        await dataSyncService.clearOddHourData()

        const response = {
            success: true,
            message: "Daily cleanup executed (test) - removed yesterday's data and odd hours",
            executed_at: new Date().toISOString(),
        }

        console.log('✅ [TEST] Manual daily cleanup completed')
        res.json(response)
    } catch (error) {
        console.error('❌ [TEST] Failed to execute daily cleanup:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to execute daily cleanup',
            error: error instanceof Error ? error.message : 'Unknown error',
        })
    }
}

// POST /api/data/test/debug-google-fit - Test: debug Google Fit API data retrieval (user)
export const testDebugGoogleFit = async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest
        const userId = authReq.user?.user_id
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            })
        }

        console.log('🧪 [TEST] Debug Google Fit API data retrieval requested')

        // Force sync hourly data for this user
        const hourlySyncResult = await dataSyncService.syncUserHourlyExerciseData(userId)

        // Get the updated data from database
        const hourlyData = await dataSyncService.getTodayHourlyStepsFromDatabase(userId)

        const response = {
            success: true,
            message: 'Google Fit debug completed',
            data: {
                user_id: userId,
                sync_result: hourlySyncResult,
                database_data: hourlyData,
                total_synced: hourlySyncResult.length,
                total_in_db: hourlyData.length,
            },
            executed_at: new Date().toISOString(),
        }

        console.log('✅ [TEST] Google Fit debug completed')
        res.json(response)
    } catch (error) {
        console.error('❌ [TEST] Google Fit debug failed:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to debug Google Fit',
            error: error instanceof Error ? error.message : 'Unknown error',
        })
    }
}

// Public API: GET /api/data/contribution/:userId - Get user's contribution data (30 days + totals)
export const getUserContributions = async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId
        if (!userId || userId.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Invalid user_id parameter',
            })
        }

        // Get 30 days contribution data
        const [contributionRows] = (await db.query(
            `SELECT day, count FROM CONTRIBUTIONS 
             WHERE user_id = ? AND day >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             ORDER BY day DESC`,
            [userId]
        )) as RowDataPacket[]

        // Get 7 days total
        const [weeklyTotal] = (await db.query(
            `SELECT SUM(CAST(count AS UNSIGNED)) as total_contributions
             FROM CONTRIBUTIONS 
             WHERE user_id = ? AND day >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
            [userId]
        )) as RowDataPacket[]

        // Get 30 days total
        const [monthlyTotal] = (await db.query(
            `SELECT SUM(CAST(count AS UNSIGNED)) as total_contributions
             FROM CONTRIBUTIONS 
             WHERE user_id = ? AND day >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
            [userId]
        )) as RowDataPacket[]

        const response = {
            success: true,
            data: {
                user_id: userId,
                recent_contributions: contributionRows,
                weekly_total: weeklyTotal[0]?.total_contributions || 0,
                monthly_total: monthlyTotal[0]?.total_contributions || 0,
                last_updated: new Date().toISOString(),
            },
        }

        res.json(response)
    } catch (error) {
        console.error('❌ [DATA] Failed to get user contributions:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve user contributions',
        })
    }
}

// Public API: GET /api/data/weekly/:userId - Get user's weekly exercise data (7 days)
export const getUserWeeklyData = async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId
        if (!userId || userId.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Invalid user_id parameter',
            })
        }

        // Get 7 days exercise data
        const [exerciseRows] = (await db.query(
            `SELECT day, exercise_quantity FROM EXERCISE 
             WHERE user_id = ? AND day >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             ORDER BY day DESC`,
            [userId]
        )) as RowDataPacket[]

        // Calculate total steps
        const totalSteps = exerciseRows.reduce(
            (sum: number, row: RowDataPacket) => sum + (row.exercise_quantity || 0),
            0
        )

        const response = {
            success: true,
            data: {
                user_id: userId,
                recent_exercise: exerciseRows,
                total_steps: totalSteps,
                period: '7 days',
                last_updated: new Date().toISOString(),
            },
        }

        res.json(response)
    } catch (error) {
        console.error('❌ [DATA] Failed to get user weekly data:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve user weekly data',
        })
    }
}

// Public API: GET /api/data/monthly/:userId - Get user's monthly exercise data (30 days)
export const getUserMonthlyData = async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId
        if (!userId || userId.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Invalid user_id parameter',
            })
        }

        // Get 30 days exercise data
        const [exerciseRows] = (await db.query(
            `SELECT day, exercise_quantity FROM EXERCISE 
             WHERE user_id = ? AND day >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             ORDER BY day DESC`,
            [userId]
        )) as RowDataPacket[]

        // Calculate total steps
        const totalSteps = exerciseRows.reduce(
            (sum: number, row: RowDataPacket) => sum + (row.exercise_quantity || 0),
            0
        )

        const response = {
            success: true,
            data: {
                user_id: userId,
                recent_exercise: exerciseRows,
                total_steps: totalSteps,
                period: '30 days',
                last_updated: new Date().toISOString(),
            },
        }

        res.json(response)
    } catch (error) {
        console.error('❌ [DATA] Failed to get user monthly data:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve user monthly data',
        })
    }
}

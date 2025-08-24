// src/routes/dataRouter.ts
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { Router } from 'express'
import {
    clearAllHourlyData,
    clearOddHourData,
    clearOutdatedHourlyData,
    clearSpecificDateData,
    clearUserHourlyData,
    getUserContributions,
    getUserData,
    getUserHourlyData,
    getUserMonthlyData,
    getUserStats,
    getUserWeeklyData,
    syncUserDataManually,
    testDailyCleanup,
    testDebugGoogleFit,
    testSyncAllUsersHourly,
} from '~/controllers/dataController'
import { verifyToken } from '~/middlewares/authMiddleware'
import { requireAdmin } from '~/middlewares/requireAdmin'

const router = Router()

// Public routes - no authentication required, just user_id param
// GET /api/data/contribution/:userId - Get user's contribution data (30 days + totals)
router.get('/contribution/:userId', getUserContributions)

// GET /api/data/weekly/:userId - Get user's weekly exercise data (7 days)
router.get('/weekly/:userId', getUserWeeklyData)

// GET /api/data/monthly/:userId - Get user's monthly exercise data (30 days)
router.get('/monthly/:userId', getUserMonthlyData)

// GET /api/data/hourly/:userId - Get user's hourly exercise data for today
router.get('/hourly/:userId', getUserHourlyData)

// Test route to check ALL user data in EXERCISE_DATE table
router.get('/test/all-exercise-date/:userId', async (req, res) => {
    try {
        const userId = req.params.userId

        // Query ALL data for this user from EXERCISE_DATE table
        const db = (await import('~/config/database')).default
        const [rows] = await db.query(`SELECT * FROM EXERCISE_DATE WHERE user_id = ? ORDER BY timestamp DESC`, [userId])

        // Also check today specifically
        const today = new Date().toISOString().split('T')[0]
        const [todayRows] = await db.query(
            `SELECT * FROM EXERCISE_DATE WHERE user_id = ? AND DATE(timestamp) = ? ORDER BY timestamp`,
            [userId, today]
        )

        res.json({
            success: true,
            data: {
                user_id: userId,
                all_records: rows,
                total_count: Array.isArray(rows) ? rows.length : 0,
                today_records: todayRows,
                today_count: Array.isArray(todayRows) ? todayRows.length : 0,
                today_date: today,
                query_time: new Date().toISOString(),
            },
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get all EXERCISE_DATE records',
            error: error instanceof Error ? error.message : 'Unknown error',
        })
    }
})

// Test route to manually test hourly with specific date
router.get('/test/hourly-date/:userId/:date', async (req, res) => {
    try {
        const userId = req.params.userId
        const testDate = req.params.date // Expected format: YYYY-MM-DD

        // Query hourly data from database for specific date
        const db = (await import('~/config/database')).default
        const [rows] = await db.query(
            `SELECT timestamp, steps 
             FROM EXERCISE_DATE 
             WHERE user_id = ? 
               AND DATE(CONVERT_TZ(timestamp, '+00:00', '+09:00')) = ?
             ORDER BY timestamp ASC`,
            [userId, testDate]
        )

        // Format data like the real hourly API
        let cumulativeSteps = 0
        const chartData = (rows as { timestamp: Date; steps: number }[]).map((row) => {
            cumulativeSteps += row.steps
            const timestamp = row.timestamp.toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' })
            const hour = parseInt(timestamp.split(' ')[1].split(':')[0])
            return {
                time: `${hour.toString().padStart(2, '0')}:00`,
                timeValue: hour,
                steps: row.steps,
                totalSteps: cumulativeSteps,
                timestamp: timestamp,
            }
        })

        res.json({
            success: true,
            data: {
                user_id: userId,
                date: testDate,
                hourly_data: chartData,
                total_steps: cumulativeSteps,
                data_points: rows.length,
                raw_query_results: rows,
            },
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get hourly data for date',
            error: error instanceof Error ? error.message : 'Unknown error',
        })
    }
})

// Test route to check timezone and date formatting issues
router.get('/test/timezone-debug', async (req, res) => {
    try {
        const now = new Date()
        const { dataSyncService } = await import('~/services/dataSyncService')

        const timezoneInfo = {
            current_timestamp: now.toISOString(),
            local_time: now.toString(),

            // Different date formats
            iso_date: now.toISOString().split('T')[0], // YYYY-MM-DD
            japan_date_service: dataSyncService.getTodayDate(), // What service uses
            japan_time: now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }),
            japan_date_only: now.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' }),

            // Check what we would query for
            database_query_date: new Date().toISOString().split('T')[0],

            // Database timestamps examples
            db_examples: [
                '2025-08-22T15:00:00.000Z', // What we see in DB
                '2025-08-24T00:00:00.000Z', // Today 00:00 UTC
                '2025-08-24T15:00:00.000Z', // Today 15:00 UTC (Japan midnight)
            ],
        }

        res.json({
            success: true,
            data: timezoneInfo,
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to debug timezone',
            error: error instanceof Error ? error.message : 'Unknown error',
        })
    }
})

// Private routes - authentication required
// GET /api/data/user - Get user's exercise and contribution data
router.get('/user', verifyToken, getUserData)

// GET /api/data/stats - Get user's statistics summary
router.get('/stats', verifyToken, getUserStats)

// POST /api/data/sync - Manual sync user data (includes hourly data)
router.post('/sync', verifyToken, syncUserDataManually)

// POST /api/data/test/sync-all-hourly - Test: trigger hourly sync for all users (admin only)
router.post('/test/sync-all-hourly', verifyToken, requireAdmin, testSyncAllUsersHourly)

// POST /api/data/test/cleanup-yesterday - Test: manually run daily cleanup (admin only)
router.post('/test/cleanup-yesterday', verifyToken, requireAdmin, testDailyCleanup)

// POST /api/data/test/debug-google-fit - Test: debug Google Fit API (user)
router.post('/test/debug-google-fit', verifyToken, testDebugGoogleFit)

// Admin routes for data cleanup
// DELETE /api/data/cleanup - Clear all hourly data (admin only)
router.delete('/cleanup', verifyToken, requireAdmin, clearAllHourlyData)

// DELETE /api/data/cleanup/user/:userId - Clear specific user's hourly data (admin only)
router.delete('/cleanup/user/:userId', verifyToken, requireAdmin, clearUserHourlyData)

// DELETE /api/data/cleanup/outdated - Clear outdated hourly data (admin only)
router.delete('/cleanup/outdated', verifyToken, requireAdmin, clearOutdatedHourlyData)

// DELETE /api/data/cleanup/odd-hours - Clear odd hour data (admin only)
router.delete('/cleanup/odd-hours', verifyToken, requireAdmin, clearOddHourData)

// DELETE /api/data/cleanup/date/:date - Clear specific date data (admin only)
router.delete('/cleanup/date/:date', verifyToken, requireAdmin, clearSpecificDateData)

export default router

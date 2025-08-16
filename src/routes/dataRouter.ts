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
    getUserData,
    getUserHourlyData,
    getUserStats,
    syncUserDataManually,
    testDailyCleanup,
    testSyncAllUsersHourly,
} from '~/controllers/dataController'
import { verifyToken } from '~/middlewares/authMiddleware'
import { requireAdmin } from '~/middlewares/requireAdmin'

const router = Router()

// GET /api/data/user - Get user's exercise and contribution data
router.get('/user', verifyToken, getUserData)

// GET /api/data/stats - Get user's statistics summary
router.get('/stats', verifyToken, getUserStats)

// GET /api/data/hourly - Get user's hourly exercise data for today
router.get('/hourly', verifyToken, getUserHourlyData)

// POST /api/data/sync - Manual sync user data (includes hourly data)
router.post('/sync', verifyToken, syncUserDataManually)

// POST /api/data/test/sync-all-hourly - Test: trigger hourly sync for all users (admin only)
router.post('/test/sync-all-hourly', verifyToken, requireAdmin, testSyncAllUsersHourly)

// POST /api/data/test/cleanup-yesterday - Test: manually run daily cleanup (admin only)
router.post('/test/cleanup-yesterday', verifyToken, requireAdmin, testDailyCleanup)

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

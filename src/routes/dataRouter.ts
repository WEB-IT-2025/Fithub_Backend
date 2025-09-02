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
    getUserHourlyData,
    getUserMonthlyData,
    getUserName,
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

// GET /api/data/userName/:userId - Get user's GitHub and Google user info
router.get('/userName/:userId', getUserName)

// GET /api/data/weekly/:userId - Get user's weekly exercise data (7 days)
router.get('/weekly/:userId', getUserWeeklyData)

// GET /api/data/monthly/:userId - Get user's monthly exercise data (30 days)
router.get('/monthly/:userId', getUserMonthlyData)

// GET /api/data/hourly/:userId - Get user's hourly exercise data for today
router.get('/hourly/:userId', getUserHourlyData)

// Private routes - authentication required
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

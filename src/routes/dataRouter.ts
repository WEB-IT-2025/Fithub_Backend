// src/routes/dataRouter.ts
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { Router } from 'express'
import {
    clearAllHourlyData,
    clearOutdatedHourlyData,
    clearUserHourlyData,
    getUserData,
    getUserHourlyData,
    getUserStats,
    syncUserDataManually,
    syncUserHourlyDataManually,
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

// POST /api/data/sync - Manual sync user data
router.post('/sync', verifyToken, syncUserDataManually)

// POST /api/data/sync/hourly - Manual sync hourly data for current user
router.post('/sync/hourly', verifyToken, syncUserHourlyDataManually)

// Admin routes for data cleanup
// DELETE /api/data/cleanup - Clear all hourly data (admin only)
router.delete('/cleanup', verifyToken, requireAdmin, clearAllHourlyData)

// DELETE /api/data/cleanup/user/:userId - Clear specific user's hourly data (admin only)
router.delete('/cleanup/user/:userId', verifyToken, requireAdmin, clearUserHourlyData)

// DELETE /api/data/cleanup/outdated - Clear outdated hourly data (admin only)
router.delete('/cleanup/outdated', verifyToken, requireAdmin, clearOutdatedHourlyData)

export default router

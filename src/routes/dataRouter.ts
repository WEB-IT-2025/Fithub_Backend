// src/routes/dataRouter.ts
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { Router } from 'express'
import { getUserData, getUserStats, syncUserDataManually } from '~/controllers/dataController'
import { verifyToken } from '~/middlewares/authMiddleware'

const router = Router()

// GET /api/data/user - Get user's exercise and contribution data
router.get('/user', verifyToken, getUserData)

// GET /api/data/stats - Get user's statistics summary
router.get('/stats', verifyToken, getUserStats)

// POST /api/data/sync - Manual sync user data
router.post('/sync', verifyToken, syncUserDataManually)

export default router

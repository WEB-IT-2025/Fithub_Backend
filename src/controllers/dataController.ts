// src/controllers/dataController.ts
import { Request, Response } from 'express'
import { RowDataPacket } from 'mysql2'
import db from '~/config/database'
import { AuthenticatedRequest } from '~/middlewares/authMiddleware'
import { dataSyncService } from '~/services/dataSyncService'

// GET /api/data/user - Get user's exercise and contribution data
export const getUserData = async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest
        const userId = authReq.user?.user_id
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            })
        }

        // Get today's date
        const today = dataSyncService.getTodayDate()

        // Get recent exercise data (last 7 days)
        const [exerciseRows] = (await db.query(
            `SELECT day, exercise_quantity FROM EXERCISE 
             WHERE user_id = ? AND day >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             ORDER BY day DESC`,
            [userId]
        )) as RowDataPacket[]

        // Get recent contribution data (last 7 days)
        const [contributionRows] = (await db.query(
            `SELECT day, count FROM CONTRIBUTIONS 
             WHERE user_id = ? AND day >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             ORDER BY day DESC`,
            [userId]
        )) as RowDataPacket[]

        // Get today's data specifically
        const [todayExercise] = (await db.query(
            `SELECT exercise_quantity FROM EXERCISE 
             WHERE user_id = ? AND DATE(day) = ?`,
            [userId, today]
        )) as RowDataPacket[]

        const [todayContribution] = (await db.query(
            `SELECT count FROM CONTRIBUTIONS 
             WHERE user_id = ? AND DATE(day) = ?`,
            [userId, today]
        )) as RowDataPacket[]

        const response = {
            success: true,
            data: {
                user_id: userId,
                today: {
                    date: today,
                    steps: todayExercise[0]?.exercise_quantity || 0,
                    contributions: parseInt(todayContribution[0]?.count || '0'),
                },
                recent_exercise: exerciseRows,
                recent_contributions: contributionRows,
                last_updated: new Date().toISOString(),
            },
        }

        res.json(response)
    } catch (error) {
        console.error('❌ [DATA] Failed to get user data:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve user data',
        })
    }
}

// GET /api/data/stats - Get user's statistics summary
export const getUserStats = async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest
        const userId = authReq.user?.user_id
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            })
        }

        // Get weekly totals
        const [weeklyStats] = (await db.query(
            `SELECT 
                SUM(exercise_quantity) as total_steps,
                COUNT(DISTINCT DATE(day)) as active_days
             FROM EXERCISE 
             WHERE user_id = ? AND day >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
            [userId]
        )) as RowDataPacket[]

        const [weeklyContributions] = (await db.query(
            `SELECT SUM(CAST(count AS UNSIGNED)) as total_contributions
             FROM CONTRIBUTIONS 
             WHERE user_id = ? AND day >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
            [userId]
        )) as RowDataPacket[]

        // Get monthly totals
        const [monthlyStats] = (await db.query(
            `SELECT 
                SUM(exercise_quantity) as total_steps,
                COUNT(DISTINCT DATE(day)) as active_days
             FROM EXERCISE 
             WHERE user_id = ? AND day >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
            [userId]
        )) as RowDataPacket[]

        const [monthlyContributions] = (await db.query(
            `SELECT SUM(CAST(count AS UNSIGNED)) as total_contributions
             FROM CONTRIBUTIONS 
             WHERE user_id = ? AND day >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
            [userId]
        )) as RowDataPacket[]

        const response = {
            success: true,
            data: {
                user_id: userId,
                weekly: {
                    total_steps: weeklyStats[0]?.total_steps || 0,
                    total_contributions: weeklyContributions[0]?.total_contributions || 0,
                    active_days: weeklyStats[0]?.active_days || 0,
                },
                monthly: {
                    total_steps: monthlyStats[0]?.total_steps || 0,
                    total_contributions: monthlyContributions[0]?.total_contributions || 0,
                    active_days: monthlyStats[0]?.active_days || 0,
                },
                last_updated: new Date().toISOString(),
            },
        }

        res.json(response)
    } catch (error) {
        console.error('❌ [DATA] Failed to get user stats:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve user statistics',
        })
    }
}

// POST /api/data/sync - Manual sync user data
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

        // Sync user data
        const syncResult = await dataSyncService.syncUserData(userId)

        const response = {
            success: true,
            message: 'Data synced successfully',
            data: {
                user_id: userId,
                synced_at: new Date().toISOString(),
                exercise_data: syncResult.exercise,
                contribution_data: syncResult.contribution,
            },
        }

        console.log(`✅ [SYNC] Manual sync completed for user: ${userId}`)
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

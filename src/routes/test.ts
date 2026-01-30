import express, { Router } from 'express'

import db from '../config/database'
import { googleTokenRefreshService } from '../services/googleTokenRefreshService'

const router: Router = express.Router()

// Test API
router.get('/hello', (req, res) => {
    res.send('Hello, Express + TypeScript from API!')
})

// Test database connection
router.get('/db', async (req, res) => {
    try {
        const [result] = await db.query('SELECT 1 + 1 AS solution')
        res.json({
            status: 'success',
            message: 'Database connection successful',
            data: result,
        })
    } catch (error) {
        console.error('Database connection error:', error)
        res.status(500).json({
            status: 'error',
            message: 'Database connection failed',
            error: error instanceof Error ? error.message : String(error),
        })
    }
})

// Test Google token refresh service
router.get('/token-report', async (req, res) => {
    try {
        const report = await googleTokenRefreshService.getTokenExpiryReport()
        res.json({
            status: 'success',
            message: 'Token report generated',
            data: report,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error('Token report error:', error)
        res.status(500).json({
            status: 'error',
            message: 'Failed to generate token report',
            error: error instanceof Error ? error.message : String(error),
        })
    }
})

// Manually trigger token refresh
router.post('/refresh-tokens', async (req, res) => {
    try {
        const result = await googleTokenRefreshService.refreshAllTokens()
        res.json({
            status: 'success',
            message: 'Token refresh completed',
            data: result,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error('Token refresh error:', error)
        res.status(500).json({
            status: 'error',
            message: 'Failed to refresh tokens',
            error: error instanceof Error ? error.message : String(error),
        })
    }
})

export default router

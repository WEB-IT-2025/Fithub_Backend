import express, { Router } from 'express'

import db from '../config/database'

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

export default router

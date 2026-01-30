import express from 'express'
import path from 'path'

const router = express.Router()

// Static pages for OAuth compliance
router.get('/privacy-policy', (_, res) => {
    res.sendFile(path.join(__dirname, '../../public/privacy-policy.html'))
})

router.get('/terms', (_, res) => {
    res.sendFile(path.join(__dirname, '../../public/terms.html'))
})

router.get('/google93eec2af99c65e22', (_, res) => {
    res.sendFile(path.join(__dirname, '../../public/google93eec2af99c65e22.html'))
})

// Test auth page
router.get('/test-auth', (_, res) => {
    res.sendFile(path.join(__dirname, '../../public/test-auth.html'))
})

export default router

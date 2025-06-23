import express from 'express'
import path from 'path'

import { ENV } from './config/loadEnv'
import webRoutes from './routes/web'

const app = express()
const port = ENV.PORT
const host = ENV.HOST_NAME

// CORS middleware for testing
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')

    if (req.method === 'OPTIONS') {
        res.sendStatus(200)
    } else {
        next()
    }
})

// Body parser middleware
app.use(express.json())

// Static files middleware
app.use(express.static(path.join(__dirname, '../public')))

// API routes
app.use('/api', webRoutes)

// Static pages for OAuth compliance
app.get('/privacy-policy', (_, res) => {
    res.sendFile(path.join(__dirname, '../public/privacy-policy.html'))
})

app.get('/terms', (_, res) => {
    res.sendFile(path.join(__dirname, '../public/terms.html'))
})

// Middleware to handle 404 errors
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Not Found',
    })
})

// Start the server
app.listen(port, () => {
    console.log('Server is running at http://' + host + ':' + port)
})

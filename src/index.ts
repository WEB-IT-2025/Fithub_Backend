import express from 'express'

import { ENV } from './config/loadEnv'
import webRoutes from './routes/web'

const app = express()
const port = ENV.PORT
const host = ENV.HOST_NAME

// API routes
app.use('/api', webRoutes)

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

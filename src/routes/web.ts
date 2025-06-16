import express from 'express'

import authRoutes from './authRouter'
import testRoutes from './test'

const web = express.Router()

web.use('/test', testRoutes)
web.use('/auth', authRoutes)

export default web

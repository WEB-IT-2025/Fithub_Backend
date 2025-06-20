import express from 'express'

import authRoutes from './authRouter'
import testRoutes from './test'

const web = express.Router()

web.use('/auth', authRoutes)
web.use('/test', testRoutes)

export default web

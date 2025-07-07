import express from 'express'

import authRoutes from './authRouter'
import dataRoutes from './dataRouter'
import testRoutes from './test'

const web = express.Router()

web.use('/auth', authRoutes)
web.use('/test', testRoutes)
web.use('/data', dataRoutes)

export default web

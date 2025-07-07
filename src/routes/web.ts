import express from 'express'

import authRoutes from './authRouter'
import dataRoutes from './dataRouter'
import testRoutes from './test'
import testRouter from './testRouter'

const web = express.Router()
web.use('/mission', missionRoutes)
web.use('/exercise', exerciseRouter)
web.use('/auth', authRoutes)
web.use('/test', testRoutes)
web.use('/data', dataRoutes)

export default web

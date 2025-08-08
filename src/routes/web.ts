import express from 'express'

import authRoutes from './authRouter'
import dataRoutes from './dataRouter'
import exerciseRouter from './exerciseRouter'
import missionRoutes from './missionRouter'
import petRouter from './petRouter'
import testRoutes from './test'
import testRouter from './testRouter'

const web = express.Router()
web.use('/mission', missionRoutes)
web.use('/exercise', exerciseRouter)
web.use('/auth', authRoutes)
web.use('/test', testRoutes)
web.use('/pet', petRouter)
web.use('/data', dataRoutes)

// 開発環境のみ
if (process.env.NODE_ENV !== 'production') {
    web.use('/admin/test', testRouter)
}
export default web

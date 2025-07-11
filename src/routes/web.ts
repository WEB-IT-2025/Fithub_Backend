import express from 'express'

import authRoutes from './authRouter'
import exerciseRouter from './exerciseRouter'
import missionRoutes from './missionRouter'
import testRoutes from './test'
import testRouter from './testRouter'
import petRouter from './petRouter' 

const web = express.Router()
web.use('/mission', missionRoutes)
web.use('/exercise', exerciseRouter)
web.use('/auth', authRoutes)
web.use('/test', testRoutes)
web.use('/', petRouter) 

// 開発環境のみ
if (process.env.NODE_ENV !== 'production') {
    web.use('/admin/test', testRouter)
}
export default web

import express from 'express'

import authRoutes from './authRouter'
import dataRoutes from './dataRouter'
import exerciseRouter from './exerciseRouter'
import groupRouter from './groupRouter'
import missionRoutes from './missionRouter'
import shopRouter from './shopRouter'
import testRoutes from './test'
import test from './testRouter'

const web = express.Router()
web.use('/auth', authRoutes)
web.use('/test', testRoutes)
web.use('/data', dataRoutes)
web.use('/exercise', exerciseRouter)
web.use('/group', groupRouter)
web.use('/test2', test)
web.use('/mission', missionRoutes)
web.use('/shop', shopRouter)

export default web

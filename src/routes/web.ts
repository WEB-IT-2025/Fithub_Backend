import express from 'express'

import authRoutes from './authRouter'
import dataRoutes from './dataRouter'
import shopRoutes from './shopRouter'
import testRoutes from './test'

const web = express.Router()

web.use('/auth', authRoutes)
web.use('/test', testRoutes)
web.use('/data', dataRoutes)
web.use('/shop', shopRoutes)

export default web

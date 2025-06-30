import express from 'express'

import authRoutes from './authRouter'
import exerciseRouter from './exerciseRouter'
import testRoutes from './test'

const web = express.Router()
web.use('/exercise', exerciseRouter)
web.use('/auth', authRoutes)
web.use('/test', testRoutes)

export default web

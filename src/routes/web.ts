import express from 'express'

import testRoutes from './test'

const web = express.Router()

web.use('/test', testRoutes)

export default web

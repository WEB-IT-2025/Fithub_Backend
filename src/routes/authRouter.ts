// src/routes/authRouter.ts
import express from 'express'

import { createAccount } from '../controllers/authController'

const router = express.Router()

router.post('/create-account', createAccount)

export default router

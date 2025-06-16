// src/controllers/authController.ts
import { Request, Response } from 'express'

import admin from '../config/firebase'
import { asyncHandler } from '../middlewares/asyncHandler'
import { userModel } from '../models/userModel'
import { generateToken } from '../services/authService'

export const createAccount = asyncHandler(async (req: Request, res: Response) => {
    const { firebase_id_token } = req.body

    if (!firebase_id_token) {
        return res.status(400).json({ success: false, message: 'firebase_id_token が必要です' })
    }

    // Firebaseトークンの検証
    const decoded = await admin.auth().verifyIdToken(firebase_id_token)

    const firebaseUid = decoded.uid
    const name = decoded.name || '名無し'
    const picture = decoded.picture || ''
    const githubId = decoded.firebase?.identities?.['github.com']?.[0] || null

    const exists = await userModel.checkUserExists(firebaseUid)
    if (!exists) {
        await userModel.create({
            userId: firebaseUid,
            userName: name,
            userIcon: picture,
            point: 0,
            gitAccess: null,
            gitId: githubId,
        })
    }

    const jwt = generateToken({ user_id: firebaseUid, user_name: name })

    return res.status(200).json({
        user_id: firebaseUid,
        user_name: name,
        user_icon: picture,
        jwt_token: jwt,
    })
})

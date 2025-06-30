import express, { Request, Response } from 'express'
import jwt from 'jsonwebtoken'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET!

// 管理者・通常ユーザー トークン発行API（開発用）
router.post('/issue-token', (req: Request, res: Response): void => {
    const { user_id, user_name, role } = req.body

    if (!user_id || !user_name || !role) {
        res.status(400).json({ message: 'user_id、user_name、roleは必須' })
        return
    }

    const payload = {
        user_id,
        user_name,
        role, // 'admin' または 'user'
    }

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
    res.status(200).json({ token })
})

export default router

import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

// 通常ユーザー
export const generateCompleteToken = (userId: string, userName: string) => {
    return jwt.sign({ user_id: userId, user_name: userName, step: 'complete' }, JWT_SECRET, { expiresIn: '7d' })
}

// 管理者ユーザー
export const generateAdminToken = (adminId: string) => {
    return jwt.sign({ admin_id: adminId, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' })
}

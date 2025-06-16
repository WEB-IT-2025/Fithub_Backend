// src/models/userModel.ts
// 例: db接続オブジェクト（prismaやsequelizeなど）
import { RowDataPacket } from 'mysql2'
import db from '~/config/database'

interface User {
    userId: string
    userName: string
    userIcon: string
    point: number
    gitAccess: string | null
    gitId: string | null
}

export const userModel = {
    async checkUserExists(userId: string): Promise<boolean> {
        const [rows] = await db.query<RowDataPacket[]>('SELECT * FROM users WHERE user_id = ?', [userId])
        return rows.length > 0
    },

    async create(user: User): Promise<void> {
        const { userId, userName, userIcon, point, gitAccess, gitId } = user
        await db.query(
            'INSERT INTO users (user_id, user_name, user_icon, point, git_access, git_id) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, userName, userIcon, point, gitAccess, gitId]
        )
    },
}

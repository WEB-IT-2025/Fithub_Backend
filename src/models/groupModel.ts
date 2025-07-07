import { OkPacket, RowDataPacket } from 'mysql2'
import db from '~/config/database'

export interface GroupRow extends RowDataPacket {
    group_id: string
    admin_id: string
    group_name: string
    max_person: number
    back_image: string
}

export const groupModel = {
    // グループ作成
    async createGroup(admin_id: string, group_name: string, max_person: number, back_image: string): Promise<number> {
        const [result] = await db.query<OkPacket>(
            'INSERT INTO GROUP_INFO (admin_id, group_name, max_person, back_image) VALUES (?, ?, ?, ?)',
            [admin_id, group_name, max_person, back_image]
        )
        return result.insertId
    },

    // 管理者をメンバーに追加
    async addGroupMember(group_id: number, user_id: string): Promise<void> {
        await db.query('INSERT INTO GROUP_MEMBER (group_id, user_id, role) VALUES (?, ?, ?)', [
            group_id,
            user_id,
            'ADMIN',
        ])
    },

    // グループ情報更新
    async updateGroup(group_id: string, group_name: string, max_person: number, back_image: string): Promise<boolean> {
        const [result] = await db.query<OkPacket>(
            'UPDATE GROUP_INFO SET group_name=?, max_person=?, back_image=? WHERE group_id=?',
            [group_name, max_person, back_image, group_id]
        )
        return result.affectedRows > 0
    },

    // グループ取得
    async getGroupById(group_id: string): Promise<GroupRow | null> {
        const [rows] = await db.query<GroupRow[]>('SELECT * FROM GROUP_INFO WHERE group_id=?', [group_id])
        return rows.length > 0 ? rows[0] : null
    },

    // グループ削除
    async deleteGroup(group_id: string): Promise<boolean> {
        const [result] = await db.query<OkPacket>('DELETE FROM GROUP_INFO WHERE group_id=?', [group_id])
        return result.affectedRows > 0
    },
}

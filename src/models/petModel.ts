import { OkPacket, RowDataPacket } from 'mysql2'
import db from '~/config/database'

export interface Pet extends RowDataPacket {
    item_id: string
    item_name: string
    item_image_url: string
    pet_type: string
    item_point: number
}

export interface UserProfile extends RowDataPacket {
    user_id: string
    user_name: string
    user_icon: string | null
    main_pet_item_id: string | null
    main_pet_name: string | null
    main_pet_user_name: string | null
    main_pet_image_url: string | null
    main_pet_type: string | null
    main_pet_size: number | null
    main_pet_intimacy: number | null
}

export interface UserPetInfo extends RowDataPacket {
    item_id: string
    item_name: string
    item_image_url: string
    pet_type: string
    user_main_pet: boolean
    user_pet_name: string
    pet_size: number
    pet_intimacy: number
}

export const petModel = {
    // ユーザー名のみ取得
    async getUserName(userId: string): Promise<string | null> {
        try {
            const [rows] = await db.query<RowDataPacket[]>('SELECT user_name FROM USERS WHERE user_id = ?', [userId])
            return rows.length > 0 ? rows[0].user_name : null
        } catch (error) {
            console.error('Error fetching user name:', error)
            throw error
        }
    },

    // ユーザーのプロフィール情報取得（メインペット情報のみ）
    async getUserProfile(userId: string): Promise<UserProfile | null> {
        try {
            const [rows] = await db.query<UserProfile[]>(
                `SELECT 
                    u.user_id,
                    u.user_name,
                    u.user_icon,
                    main_up.item_id as main_pet_item_id,
                    main_i.item_name as main_pet_name,
                    main_up.user_pet_name as main_pet_user_name,
                    main_i.item_image_url as main_pet_image_url,
                    main_p.pet_type as main_pet_type,
                    main_up.pet_size as main_pet_size,
                    main_up.pet_intimacy as main_pet_intimacy
                FROM USERS u
                LEFT JOIN USERS_PETS main_up ON u.user_id = main_up.user_id AND main_up.user_main_pet = TRUE
                LEFT JOIN PETS main_p ON main_up.item_id = main_p.item_id
                LEFT JOIN ITEMS main_i ON main_p.item_id = main_i.item_id
                WHERE u.user_id = ?`,
                [userId]
            )
            return rows.length > 0 ? rows[0] : null
        } catch (error) {
            console.error('Error fetching user profile:', error)
            throw error
        }
    },

    // ユーザーが所有しているペット一覧取得
    async getUserOwnedPets(userId: string): Promise<UserPetInfo[]> {
        try {
            const [rows] = await db.query<UserPetInfo[]>(
                `SELECT 
                    up.item_id,
                    i.item_name,
                    i.item_image_url,
                    p.pet_type,
                    up.user_main_pet,
                    up.user_pet_name,
                    up.pet_size,
                    up.pet_intimacy
                FROM USERS_PETS up
                JOIN PETS p ON up.item_id = p.item_id
                JOIN ITEMS i ON p.item_id = i.item_id
                WHERE up.user_id = ?
                ORDER BY up.user_main_pet DESC, i.item_name`,
                [userId]
            )
            return rows
        } catch (error) {
            console.error('Error fetching user owned pets:', error)
            throw error
        }
    },

    // 利用可能な全ペット一覧取得（購入状況含む）
    // 主ペット更新
    async updateUserMainPet(userId: string, itemId: string, petName: string): Promise<boolean> {
        try {
            // まず現在の主ペットを解除
            await db.query('UPDATE USERS_PETS SET user_main_pet = FALSE WHERE user_id = ? AND user_main_pet = TRUE', [
                userId,
            ])

            // 新しい主ペットを設定
            const [result] = await db.query<OkPacket>(
                'UPDATE USERS_PETS SET user_main_pet = TRUE, user_pet_name = ? WHERE user_id = ? AND item_id = ?',
                [petName, userId, itemId]
            )
            return result.affectedRows > 0
        } catch (error) {
            console.error('Error updating main pet:', error)
            return false
        }
    },

    // ペットの成長データ更新（サイズと親密度）
    async updatePetGrowthData(userId: string, itemId: string, petSize: number, petIntimacy: number): Promise<boolean> {
        try {
            const [result] = await db.query<OkPacket>(
                'UPDATE USERS_PETS SET pet_size = ?, pet_intimacy = ? WHERE user_id = ? AND item_id = ?',
                [petSize, petIntimacy, userId, itemId]
            )
            return result.affectedRows > 0
        } catch (error) {
            console.error('Error updating pet growth data:', error)
            return false
        }
    },

    // ペットを持つ全ユーザーのリストを取得
    async getAllUsersWithPets(): Promise<{ user_id: string }[]> {
        try {
            const [rows] = await db.query<RowDataPacket[]>('SELECT DISTINCT user_id FROM USERS_PETS', [])
            return rows as { user_id: string }[]
        } catch (error) {
            console.error('Error fetching users with pets:', error)
            throw error
        }
    },

    // ペットの購入日を取得（親密度計算用）
    async getPetPurchaseDate(userId: string, itemId: string): Promise<Date | null> {
        try {
            const [rows] = await db.query<RowDataPacket[]>(
                `SELECT purchase_time 
                 FROM PURCHASES 
                 WHERE user_id = ? AND item_id = ? 
                 ORDER BY purchase_time ASC 
                 LIMIT 1`,
                [userId, itemId]
            )
            return rows.length > 0 ? new Date(rows[0].purchase_time) : null
        } catch (error) {
            console.error('Error fetching pet purchase date:', error)
            return null
        }
    },

    // 親密度アイテムの使用回数を取得
    async getIntimacyItemUsageCount(userId: string, itemId: string): Promise<number> {
        try {
            const [rows] = await db.query<RowDataPacket[]>(
                `SELECT COALESCE(SUM(ui.item_count), 0) as total_usage
                 FROM USERS_ITEMS ui
                 JOIN ITEMS i ON ui.item_id = i.item_id
                 WHERE ui.user_id = ? AND ui.usage_intimacy = TRUE
                 AND EXISTS (SELECT 1 FROM USERS_PETS up WHERE up.user_id = ? AND up.item_id = ?)`,
                [userId, userId, itemId]
            )
            return rows.length > 0 ? Number(rows[0].total_usage) : 0
        } catch (error) {
            console.error('Error fetching intimacy item usage count:', error)
            return 0
        }
    },

    // ペットがメインペットかどうかを確認
    async isMainPet(userId: string, itemId: string): Promise<boolean> {
        try {
            const [rows] = await db.query<RowDataPacket[]>(
                `SELECT user_main_pet FROM USERS_PETS WHERE user_id = ? AND item_id = ?`,
                [userId, itemId]
            )
            return rows.length > 0 ? Boolean(rows[0].user_main_pet) : false
        } catch (error) {
            console.error('Error checking main pet status:', error)
            return false
        }
    },
}

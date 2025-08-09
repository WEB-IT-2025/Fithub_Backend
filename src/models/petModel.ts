import { OkPacket, RowDataPacket } from 'mysql2'
import db from '~/config/database'

export interface Pet extends RowDataPacket {
    item_id: string
    pet_name: string
    pet_image_folder: string
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
    main_pet_image_folder: string | null
    main_pet_type: string | null
    main_pet_size: number | null
    main_pet_health: number | null
    main_pet_intimacy: number | null
}

export interface UserPetInfo extends RowDataPacket {
    item_id: string
    pet_name: string
    pet_image_folder: string
    pet_type: string
    user_main_pet: boolean
    user_pet_name: string
    user_sub_pet: boolean | null
    pet_size: number
    pet_states: number
}

export interface PetSizeStandardDTO {
    pet_size_logic: number
}

export interface PetHealthStandardDTO {
    pet_health_logic: number
}

export const petModel = {
    // ユーザーのプロフィール情報取得（メインペット情報のみ）
    async getUserProfile(userId: string): Promise<UserProfile | null> {
        try {
            const [rows] = await db.query<UserProfile[]>(
                `SELECT 
                    u.user_id,
                    u.user_name,
                    u.user_icon,
                    main_up.item_id as main_pet_item_id,
                    main_p.pet_name as main_pet_name,
                    main_up.user_pet_name as main_pet_user_name,
                    main_p.pet_image_folder as main_pet_image_folder,
                    main_p.pet_type as main_pet_type,
                    main_up.pet_size as main_pet_size,
                    main_up.pet_states as main_pet_health,
                    -- 親密度は pet_states の値をそのまま使用（または別の計算式を使用可能）
                    main_up.pet_states as main_pet_intimacy
                FROM USERS u
                LEFT JOIN USERS_PETS main_up ON u.user_id = main_up.user_id AND main_up.user_main_pet = TRUE
                LEFT JOIN PETS main_p ON main_up.item_id = main_p.item_id
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
                    p.pet_name,
                    p.pet_image_folder,
                    p.pet_type,
                    up.user_main_pet,
                    up.user_pet_name,
                    up.user_sub_pet,
                    up.pet_size,
                    up.pet_states
                FROM USERS_PETS up
                JOIN PETS p ON up.item_id = p.item_id
                WHERE up.user_id = ?
                ORDER BY up.user_main_pet DESC, up.user_sub_pet DESC, p.pet_name`,
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

    // サブペット更新
    async updateUserSubPet(userId: string, itemId: string, petName: string): Promise<boolean> {
        try {
            // まず現在のサブペットを解除
            await db.query('UPDATE USERS_PETS SET user_sub_pet = NULL WHERE user_id = ? AND user_sub_pet = TRUE', [
                userId,
            ])

            // 新しいサブペットを設定
            const [result] = await db.query<OkPacket>(
                'UPDATE USERS_PETS SET user_sub_pet = TRUE, user_pet_name = ? WHERE user_id = ? AND item_id = ?',
                [petName, userId, itemId]
            )
            return result.affectedRows > 0
        } catch (error) {
            console.error('Error updating sub pet:', error)
            return false
        }
    },

    // ペットサイズ基準更新（管理者）
    async updatePetSizeStandard(standards: PetSizeStandardDTO): Promise<boolean> {
        try {
            const [result] = await db.query<OkPacket>('UPDATE THRESHOLD SET pet_size_logic = ?', [
                standards.pet_size_logic,
            ])
            return result.affectedRows > 0
        } catch (error) {
            console.error('Error updating pet size standards:', error)
            return false
        }
    },

    // ペット健康度基準更新（管理者）
    async updatePetHealthStandard(standards: PetHealthStandardDTO): Promise<boolean> {
        try {
            const [result] = await db.query<OkPacket>('UPDATE THRESHOLD SET pet_health_logic = ?', [
                standards.pet_health_logic,
            ])
            return result.affectedRows > 0
        } catch (error) {
            console.error('Error updating pet health standards:', error)
            return false
        }
    },
}

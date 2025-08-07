import db from '~/config/database'

export interface PetParams {
    health: number // 健康度（歩数ベース）
    size: number // サイズ（GitHubコントリビューション数ベース）
    intimacy: number // 親密度（購入日数と育成度ベース）
}

interface StepsResult {
    avg_steps: number | null
}

interface ContributionResult {
    total_contributions: number | null
}

interface ThresholdData {
    steps_point_settings: number
    pet_size_logic: number
    pet_health_logic: number
    exercise_settings: number
}

export const petModel = {
    async getPetsByUserId(userId: string) {
        const sql = `
            SELECT 
                p.item_id,
                p.pet_name,
                p.pet_image_folder,
                p.pet_type,
                up.user_pet_name,
                up.user_main_pet,
                up.user_sub_pet,
                up.pet_size,
                up.pet_states,
                pur.purchase_time
            FROM USERS_PETS up
            JOIN PETS p ON up.item_id = p.item_id
            JOIN PURCHASES pur ON up.user_id = pur.user_id AND up.item_id = pur.item_id
            WHERE up.user_id = ?
        `
        const [rows] = await db.query(sql, [userId])
        return rows
    },

    async updateUserMainPet(user_id: string, item_id: string, user_main_pet: boolean) {
        // まず該当ペットが存在するか確認
        const [rows] = (await db.query('SELECT * FROM USERS_PETS WHERE user_id = ? AND item_id = ?', [
            user_id,
            item_id,
        ])) as [unknown[], unknown]
        if (!Array.isArray(rows) || rows.length === 0) return false

        // すべてのペットのuser_main_petをfalseにする（主ペットは1匹だけにする場合）
        await db.query('UPDATE USERS_PETS SET user_main_pet = false WHERE user_id = ?', [user_id])

        // 指定ペットのuser_main_petを更新
        await db.query('UPDATE USERS_PETS SET user_main_pet = ? WHERE user_id = ? AND item_id = ?', [
            user_main_pet,
            user_id,
            item_id,
        ])

        return true
    },

    async updateUserSubPet(user_id: string, item_id: string, user_sub_pet: boolean) {
        // まず該当ペットが存在するか確認
        const [rows] = (await db.query('SELECT * FROM USERS_PETS WHERE user_id = ? AND item_id = ?', [
            user_id,
            item_id,
        ])) as [unknown[], unknown]
        if (!Array.isArray(rows) || rows.length === 0) return false

        // 指定ペットのuser_sub_petを更新
        await db.query('UPDATE USERS_PETS SET user_sub_pet = ? WHERE user_id = ? AND item_id = ?', [
            user_sub_pet,
            user_id,
            item_id,
        ])

        return true
    },

    async getPetById(item_id: string) {
        const [rows] = (await db.query('SELECT * FROM PETS WHERE item_id = ?', [item_id])) as [unknown[], unknown]
        return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
    },

    async createPet(item_id: string, pet_name: string, pet_image_folder: string, pet_type: string) {
        // まずITEMSテーブルにアイテムを作成
        await db.query(
            'INSERT INTO ITEMS (item_id, item_name, item_point, sold_count, item_image_folder, item_create_day, item_delete_day, item_details, item_category) VALUES (?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), "pet", "pet")',
            [item_id, pet_name, 100, 0, pet_image_folder]
        )

        // 次にPETSテーブルにペット情報を作成
        await db.query('INSERT INTO PETS (item_id, pet_name, pet_image_folder, pet_type) VALUES (?, ?, ?, ?)', [
            item_id,
            pet_name,
            pet_image_folder,
            pet_type,
        ])
    },

    async deletePetById(item_id: string) {
        await db.query('DELETE FROM PETS WHERE item_id = ?', [item_id])
    },

    // ペットのパラメータを計算する新しいメソッド（THRESHOLDテーブルを使用）
    async calculatePetParams(userId: string, purchaseTime: Date, isMainPet: boolean = false): Promise<PetParams> {
        // THRESHOLDテーブルから設定値を取得
        const [thresholdRows] = (await db.query('SELECT * FROM THRESHOLD LIMIT 1')) as [unknown[], unknown]
        const threshold =
            Array.isArray(thresholdRows) && thresholdRows.length > 0 ?
                (thresholdRows[0] as ThresholdData)
            :   { steps_point_settings: 1, pet_size_logic: 40, pet_health_logic: 100, exercise_settings: 1 }

        // 健康度: 最近の歩数データから計算（メイン/サブ関係なく同じ）
        const [stepsRows] = (await db.query(
            `
            SELECT AVG(steps) as avg_steps 
            FROM EXERCISE_DATE 
            WHERE user_id = ? AND timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `,
            [userId]
        )) as [unknown[], unknown]

        const avgSteps =
            Array.isArray(stepsRows) && stepsRows.length > 0 && stepsRows[0] ?
                (stepsRows[0] as StepsResult).avg_steps || 0
            :   0
        // THRESHOLDの pet_health_logic を使用して健康度を計算
        const health = Math.min(100, Math.floor(avgSteps / threshold.pet_health_logic))

        // サイズ: GitHubコントリビューション数から計算（メインペットの方が成長しやすい）
        const [contribRows] = (await db.query(
            `
            SELECT SUM(CAST(count AS UNSIGNED)) as total_contributions 
            FROM CONTRIBUTIONS 
            WHERE user_id = ? AND day >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `,
            [userId]
        )) as [unknown[], unknown]

        const totalContributions =
            Array.isArray(contribRows) && contribRows.length > 0 && contribRows[0] ?
                (contribRows[0] as ContributionResult).total_contributions || 0
            :   0

        // メインペットはサイズが成長しやすい（1.5倍のボーナス）+ THRESHOLDの pet_size_logic を使用
        const sizeMultiplier = isMainPet ? 1.5 : 1.0
        const size = Math.min(100, Math.floor(totalContributions * (100 / threshold.pet_size_logic) * sizeMultiplier))

        // 親密度: 購入からの日数と育成度で計算（メインペットの方が親密度が上がりやすい）
        const daysSincePurchase = Math.floor((Date.now() - purchaseTime.getTime()) / (1000 * 60 * 60 * 24))
        const intimacyMultiplier = isMainPet ? 1.3 : 0.8 // メインペットは1.3倍、サブペットは0.8倍
        const intimacy = Math.min(100, Math.floor((daysSincePurchase * 2 + (health + size) / 10) * intimacyMultiplier))

        return { health, size, intimacy }
    },

    // THRESHOLD操作関連のメソッド
    async getThreshold() {
        const [rows] = (await db.query('SELECT * FROM THRESHOLD LIMIT 1')) as [unknown[], unknown]
        return Array.isArray(rows) && rows.length > 0 ? (rows[0] as ThresholdData) : null
    },

    async updatePetSizeThreshold(pet_size: number) {
        const [result] = await db.query('UPDATE THRESHOLD SET pet_size_logic = ?', [pet_size])
        return result
    },

    async updatePetHealthThreshold(pet_health: number) {
        const [result] = await db.query('UPDATE THRESHOLD SET pet_health_logic = ?', [pet_health])
        return result
    },
}

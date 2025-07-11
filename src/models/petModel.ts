import db from '~/config/database'

export const petModel = {
    async getPetsByUserId(userId: string) {
        const sql = `
            SELECT 
                p.pet_id,
                p.pet_name,
                p.pet_image_folder,
                up.user_pet_name,
                up.user_main_pet,
                up.user_sub_pet
            FROM USERS_PETS up
            JOIN PETS p ON up.pet_id = p.pet_id
            WHERE up.user_id = ?
        `;
        const [rows] = await db.query(sql, [userId]);
        return rows;
    },

    async updateUserMainPet(user_id: string, pet_id: string, user_main_pet: boolean) {
        // まず該当ペットが存在するか確認
        const [rows] = await db.query(
            'SELECT * FROM USERS_PETS WHERE user_id = ? AND pet_id = ?',
            [user_id, pet_id]
        ) as [any[], any];
        if (!rows || rows.length === 0) return false;

        // すべてのペットのuser_main_petをfalseにする（主ペットは1匹だけにする場合）
        await db.query(
            'UPDATE USERS_PETS SET user_main_pet = false WHERE user_id = ?',
            [user_id]
        );

        // 指定ペットのuser_main_petを更新
        await db.query(
            'UPDATE USERS_PETS SET user_main_pet = ? WHERE user_id = ? AND pet_id = ?',
            [user_main_pet, user_id, pet_id]
        );

        return true;
    },

    async updateUserSubPet(user_id: string, pet_id: string, user_sub_pet: boolean) {
        // まず該当ペットが存在するか確認
        const [rows] = await db.query(
            'SELECT * FROM USERS_PETS WHERE user_id = ? AND pet_id = ?',
            [user_id, pet_id]
        ) as [any[], any];
        if (!rows || rows.length === 0) return false;

        // 指定ペットのuser_sub_petを更新
        await db.query(
            'UPDATE USERS_PETS SET user_sub_pet = ? WHERE user_id = ? AND pet_id = ?',
            [user_sub_pet, user_id, pet_id]
        );

        return true;
    },

    async getPetById(pet_id: string) {
        const [rows] = await db.query('SELECT * FROM PETS WHERE pet_id = ?', [pet_id]) as [any[], any];
        return rows[0] || null;
    },

    async createPet(pet_id: string, pet_name: string, pet_image_folder: string) {
        await db.query(
            'INSERT INTO PETS (pet_id, pet_name, pet_image_folder) VALUES (?, ?, ?)',
            [pet_id, pet_name, pet_image_folder]
        );
    },
    async deletePetById(pet_id: string) {
        await db.query('DELETE FROM PETS WHERE pet_id = ?', [pet_id]);
    }
};
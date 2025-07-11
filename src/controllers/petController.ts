import { Request, Response } from 'express';
import { petModel } from '../models/petModel';
import { GENERAL_MESSAGES } from '../constants/messages';

/**
 * ユーザーのペット一覧を取得するコントローラー
 * 認証ミドルウェアでJWTからuser_idを取得し、そのユーザーのペット情報を返す
 */
export const getUserPets = async (req: Request, res: Response): Promise<void> => {
    // 1. 認証ミドルウェアでセットされたuser_idを型アサーションで取得
    const user_id = (req.user as { user_id?: string })?.user_id;

    // 2. user_idがなければ認証エラーを返す
    if (!user_id) {
        res.status(401).json({ message: '認証情報が無効です' });
        return;
    }

    try {
        // 3. モデルを使ってDBからユーザーのペット一覧を取得
        const pets = await petModel.getPetsByUserId(user_id) as any[];

        // 4. ペットがいなければ404エラーを返す
        if (!pets || pets.length === 0) {
            res.status(404).json({ message: 'ペットが見つかりません' });
            return;
        }

        // 5. ペット情報を200で返す
        res.status(200).json(pets);
    } catch (err) {
        // 6. 予期せぬエラーは500で返す
        res.status(500).json({ message: 'ユーザーペット情報取得エラー' });
    }
};

/**
 * ユーザーの主ペットを更新するコントローラー
 * PUT /users/pets/:pet_id/main
 */
export const updateUserMainPet = async (req: Request, res: Response): Promise<void> => {
    // JWT認証ミドルウェアでセットされたuser_idを取得
    const user_id = (req.user as { user_id?: string })?.user_id;
    const pet_id = req.params.pet_id;
    const { user_main_pet } = req.body;

    // 必須項目チェック
    if (!user_id || !pet_id || typeof user_main_pet !== 'boolean') {
        res.status(400).json({ message: 'リクエストが不正です' });
        return;
    }

    try {
        // 主ペットを更新（petModelで実装が必要）
        const result = await petModel.updateUserMainPet(user_id, pet_id, user_main_pet);

        if (!result) {
            res.status(404).json({ message: 'ペットが見つかりません' });
            return;
        }

        res.status(200).json({ message: '主ペットを更新しました。' });
    } catch (err) {
        res.status(500).json({ message: 'ユーザーペット情報更新エラー' });
    }
};

/**
 * ユーザーのサブペットを更新するコントローラー
 * PUT /users/pets/:pet_id/sub
 */
export const updateUserSubPet = async (req: Request, res: Response): Promise<void> => {
    // JWT認証ミドルウェアでセットされたuser_idを取得
    const user_id = (req.user as { user_id?: string })?.user_id;
    const pet_id = req.params.pet_id;
    const { user_sub_pet } = req.body;

    // 必須項目チェック
    if (!user_id || !pet_id || typeof user_sub_pet !== 'boolean') {
        res.status(400).json({ message: 'リクエストが不正です' });
        return;
    }

    try {
        // サブペットを更新（petModelで実装が必要）
        const result = await petModel.updateUserSubPet(user_id, pet_id, user_sub_pet);

        if (!result) {
            res.status(404).json({ message: 'ペットが見つかりません' });
            return;
        }

        res.status(200).json({ message: 'サブペットを更新しました。' });
    } catch (err) {
        res.status(500).json({ message: 'ユーザーペット情報更新エラー' });
    }
};

/**
 * 管理者によるペット新規登録コントローラー
 * POST /admin/pets
 */
export const registerPet = async (req: Request, res: Response): Promise<void> => {
    const { pet_id, pet_name, pet_image_folder } = req.body;

    // 必須項目チェック
    if (!pet_id || !pet_name || !pet_image_folder) {
        res.status(400).json({ message: 'リクエストが不正です' });
        return;
    }

    try {
        // すでに同じpet_idが存在するか確認
        const exists = await petModel.getPetById(pet_id);
        if (exists) {
            res.status(400).json({ message: 'このペットは既に登録されています' });
            return;
        }

        // ペット情報を登録
        await petModel.createPet(pet_id, pet_name, pet_image_folder);

        res.status(201).json({ message: 'ペット情報を登録しました。' });
    } catch (err) {
        res.status(500).json({ message: 'ペット情報登録エラー' });
    }
};

/**
 * 管理者によるペット削除コントローラー
 * DELETE /admin/pets/:pet_id
 */
export const deletePet = async (req: Request, res: Response): Promise<void> => {
    const pet_id = req.params.pet_id;

    // 必須項目チェック
    if (!pet_id) {
        res.status(400).json({ error: 'リクエストが不正です' });
        return;
    }

    try {
        // 指定されたペットが存在するか確認
        const pet = await petModel.getPetById(pet_id);
        if (!pet) {
            res.status(404).json({ error: '指定されたペットが見つかりません。' });
            return;
        }

        // ペットを削除
        await petModel.deletePetById(pet_id);

        res.status(200).json({ message: 'ペットを削除しました。' });
    } catch (err) {
        res.status(403).json({ error: 'ペット削除権限がありません。' });
    }
};
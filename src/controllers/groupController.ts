import { Request, Response } from 'express'
import { asyncHandler } from '~/middlewares/asyncHandler'
import { groupModel } from '~/models/groupModel'

// ルーターで利用
// グループ作成
export const createGroup = asyncHandler(async (req: Request, res: Response) => {
    const { user_id, group_name, max_in_person, back_image } = req.body
    if (!user_id || !group_name || !max_in_person || !back_image) {
        return res.status(400).json({ error: '全ての項目が必須です。' })
    }
    // グループ作成
    const groupId = await groupModel.createGroup(user_id, group_name, max_in_person, back_image)
    // 管理者をメンバーに追加
    await groupModel.addGroupMember(groupId, user_id)
    res.status(201).json({ message: 'グループを登録しました。' })
})

// グループ情報更新
export const updateGroup = asyncHandler(async (req: Request, res: Response) => {
    const { group_id } = req.params
    const { group_name, max_in_person, back_image } = req.body
    const updated = await groupModel.updateGroup(group_id, group_name, max_in_person, back_image)
    if (!updated) {
        return res.status(404).json({ error: 'グループが見つかりません' })
    }
    res.json({ message: 'グループ情報を更新しました。' })
})

export const deleteGroup = asyncHandler(async (req: Request, res: Response) => {
    const { group_id, user_id } = req.body // bodyから受け取る
    const group = await groupModel.getGroupById(group_id)
    if (!group) {
        return res.status(404).json({ error: 'グループが見つかりません。' })
    }
    if (group.admin_id !== user_id) {
        return res.status(401).json({ error: 'この操作を行う権限がありません。' })
    }
    const deleted = await groupModel.deleteGroup(group_id)
    if (!deleted) {
        return res.status(500).json({ error: 'グループ削除中にエラーが発生しました。' })
    }
    res.json({ message: 'グループを削除しました。' })
})

export const adminDeleteGroup = asyncHandler(async (req: Request, res: Response) => {
    const { group_id } = req.body // bodyから受け取る
    const deleted = await groupModel.deleteGroup(group_id)
    if (!deleted) {
        return res.status(404).json({ error: 'グループが見つかりません。' })
    }
    res.json({ message: 'グループを削除しました。' })
})

// src/controllers/groupsController.ts
import { Request, Response } from 'express'
import { asyncHandler } from '~/middlewares/asyncHandler'
import { groupModel } from '~/models/groupModel'

// グループ作成
export const createGroup = asyncHandler(async (req: Request, res: Response) => {
    const { user_id, group_name, max_in_person, back_image, group_public } = req.body
    const groupId = await groupModel.createGroup(user_id, group_name, max_in_person, back_image, group_public)
    await groupModel.addGroupMember(groupId, user_id)
    res.status(201).json({ message: 'グループを登録しました。' })
})

// グループ情報更新
export const updateGroup = asyncHandler(async (req: Request, res: Response) => {
    const { group_id, group_name, max_in_person, back_image } = req.body
    const updated = await groupModel.updateGroup(group_id, group_name, max_in_person, back_image)
    if (!updated) return res.status(404).json({ error: 'グループが見つかりません' })
    res.json({ message: 'グループ情報を更新しました。' })
})

// グループ削除（admin確認）
export const deleteGroup = asyncHandler(async (req: Request, res: Response) => {
    const { group_id, user_id } = req.body
    const group = await groupModel.getGroupById(group_id)
    if (!group) return res.status(404).json({ error: 'グループが見つかりません。' })
    if (group.admin_id !== user_id) return res.status(401).json({ error: 'この操作を行う権限がありません。' })
    const deleted = await groupModel.deleteGroup(group_id)
    if (!deleted) return res.status(500).json({ error: 'グループ削除中にエラーが発生しました。' })
    res.json({ message: 'グループを削除しました。' })
})

// グループ削除（admin直接）
export const adminDeleteGroup = asyncHandler(async (req: Request, res: Response) => {
    const { group_id } = req.body
    const deleted = await groupModel.deleteGroup(group_id)
    if (!deleted) return res.status(404).json({ error: 'グループが見つかりません。' })
    res.json({ message: 'グループを削除しました。' })
})

// ユーザーが入ってるグループ一覧
export const getUserGroups = asyncHandler(async (req: Request, res: Response) => {
    const { user_id } = req.body
    const groups = await groupModel.getGroupsByUserId(user_id)
    if (!groups || groups.length === 0) return res.status(404).json({ error: 'グループが見つかりません' })
    const result = groups.map((g) => ({
        group_id: g.group_id,
        group_name: g.group_name,
        max_in_person: `${g.current_count}/${g.max_person}`,
        back_image: g.back_image,
    }))
    res.status(200).json(result)
})

// グループメンバー取得
export const getGroupMembers = asyncHandler(async (req: Request, res: Response) => {
    const { group_id } = req.body
    const members = await groupModel.getGroupMembers(group_id)
    if (!members || members.length === 0) return res.status(404).json({ error: 'グループが見つかりません' })
    res.status(200).json(members)
})

// グループにメンバー追加
export const addGroupMember = asyncHandler(async (req: Request, res: Response) => {
    const { group_id, user_id } = req.body
    await groupModel.addGroupMember(group_id, user_id)
    const members = await groupModel.getGroupMembers(group_id)
    res.status(200).json(members)
})

// グループからメンバー削除（退出 or admin削除）
export const removeGroupMember = asyncHandler(async (req: Request, res: Response) => {
    const { group_id, user_id, requester_id } = req.body
    const group = await groupModel.getGroupById(group_id)
    if (!group) return res.status(404).json({ error: 'グループが見つかりません。' })
    if (group.admin_id !== requester_id && user_id !== requester_id) {
        return res.status(401).json({ error: 'この操作を行う権限がありません。' })
    }
    await groupModel.removeGroupMember(group_id, user_id)
    const members = await groupModel.getGroupMembers(group_id)
    res.status(200).json(members)
})

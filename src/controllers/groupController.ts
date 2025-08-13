// src/controllers/groupController.ts（ミドルウェア使用版）
import { Request, Response } from 'express'
import { asyncHandler } from '~/middlewares/asyncHandler'
import { groupModel } from '~/models/groupModel'
import { UserPayload } from '~/types/UserPayload'

// グループ作成（作成者が自動的にグループリーダーになる）
export const createGroup = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as UserPayload
    const { group_name, max_person, back_image, group_public } = req.body

    const user_id = user.user_id
    const group_id = await groupModel.getNextGroupId()

    const createdGroupId = await groupModel.createGroup(
        group_id,
        user_id,
        group_name,
        max_person,
        back_image,
        group_public ?? true // ← チェックなしなら true = 公開
    )

    await groupModel.addGroupMember(createdGroupId, user_id)

    res.status(201).json({
        message: 'グループを作成しました。あなたがグループリーダーです。',
        group_id: createdGroupId,
        role: 'GROUP_LEADER',
    })
})

// グループ情報更新（requireGroupLeaderミドルウェアで保護済み）
export const updateGroup = asyncHandler(async (req: Request, res: Response) => {
    const { group_id, group_name, max_person, back_image } = req.body

    // ミドルウェアで権限チェック済みなので、直接実行
    const updated = await groupModel.updateGroup(group_id, group_name, max_person, back_image)
    if (!updated) {
        return res.status(404).json({ error: 'グループが見つかりません。' })
    }

    res.json({ message: 'グループ情報を更新しました。' })
})

// グループ削除（requireGroupLeaderミドルウェアで保護済み）
export const deleteGroup = asyncHandler(async (req: Request, res: Response) => {
    const { group_id } = req.body

    // ミドルウェアで権限チェック済みなので、直接実行
    const deleted = await groupModel.deleteGroup(group_id)
    if (!deleted) {
        return res.status(404).json({ error: 'グループが見つかりません。' })
    }

    res.json({ message: 'グループを削除しました。' })
})

// グループ削除（requireAdminミドルウェアで保護済み）
export const adminDeleteGroup = asyncHandler(async (req: Request, res: Response) => {
    const { group_id } = req.body

    const deleted = await groupModel.deleteGroup(group_id)
    if (!deleted) {
        return res.status(404).json({ error: 'グループが見つかりません。' })
    }

    res.json({ message: 'システム管理者によりグループを削除しました。' })
})

// メンバー削除（requireGroupLeaderミドルウェアで保護済み）
export const removeGroupMember = asyncHandler(async (req: Request, res: Response) => {
    const { group_id, user_id } = req.body
    const requester = req.user as UserPayload

    const group = await groupModel.getGroupById(group_id)
    if (!group) {
        return res.status(404).json({ error: 'グループが見つかりません。' })
    }

    // グループリーダーは自分自身を削除できない
    if (group.admin_id === user_id) {
        return res.status(400).json({
            error: 'グループリーダーは自分自身を削除できません。',
        })
    }

    // メンバーシップ確認
    const isMember = await groupModel.isGroupMember(group_id, user_id)
    if (!isMember) {
        return res.status(400).json({ error: 'ユーザーはグループのメンバーではありません。' })
    }

    await groupModel.removeGroupMember(group_id, user_id)
    const updatedMembers = await groupModel.getGroupMembers(group_id)

    const result = updatedMembers.map((member) => ({
        ...member,
        is_leader: member.user_id === group.admin_id,
        role: member.user_id === group.admin_id ? 'GROUP_LEADER' : 'MEMBER',
    }))

    res.status(200).json(result)
})
// ユーザーが所属するグループ一覧
export const getUserGroups = asyncHandler(async (req: Request, res: Response) => {
    const { user_id } = req.params

    if (!user_id) {
        return res.status(400).json({ error: 'ユーザーIDが必要です。' })
    }

    const groups = await groupModel.getGroupsByUserId(user_id)

    if (!groups || groups.length === 0) {
        return res.status(200).json([])
    }

    const result = groups.map((g) => ({
        group_id: g.group_id,
        group_name: g.group_name,
        max_person: `${g.current_count}/${g.max_person}`, // レスポンス名は元のまま
        back_image: g.back_image,
        is_leader: g.admin_id === user_id,
        role: g.admin_id === user_id ? 'GROUP_LEADER' : 'MEMBER',
    }))

    res.status(200).json(result)
})

// グループメンバー取得
export const getGroupMembers = asyncHandler(async (req: Request, res: Response) => {
    const { group_id } = req.params

    if (!group_id) {
        return res.status(400).json({ error: 'グループIDが必要です。' })
    }

    // グループ存在確認
    const group = await groupModel.getGroupById(group_id)
    if (!group) {
        return res.status(404).json({ error: 'グループが見つかりません。' })
    }

    const members = await groupModel.getGroupMembers(group_id)

    // グループリーダー情報を含めてレスポンス
    const result = members.map((member) => ({
        ...member,
        is_leader: member.user_id === group.admin_id,
        role: member.user_id === group.admin_id ? 'GROUP_LEADER' : 'MEMBER',
    }))

    res.status(200).json(result)
})

// グループにメンバー追加
export const addGroupMember = asyncHandler(async (req: Request, res: Response) => {
    const { group_id, user_id, requester_id } = req.body

    // グループ存在確認
    const group = await groupModel.getGroupById(group_id)
    if (!group) {
        return res.status(404).json({ error: 'グループが見つかりません。' })
    }

    // 定員チェック
    const currentMemberCount = await groupModel.getGroupMemberCount(group_id)
    if (currentMemberCount >= group.max_person) {
        return res.status(400).json({ error: 'グループの定員に達しています。' })
    }

    // 既存メンバーチェック
    const isAlreadyMember = await groupModel.isGroupMember(group_id, user_id)
    if (isAlreadyMember) {
        return res.status(400).json({ error: '既にグループのメンバーです。' })
    }

    await groupModel.addGroupMember(group_id, user_id)
    const updatedMembers = await groupModel.getGroupMembers(group_id)

    // グループリーダー情報を含めてレスポンス
    const result = updatedMembers.map((member) => ({
        ...member,
        is_leader: member.user_id === group.admin_id,
        role: member.user_id === group.admin_id ? 'GROUP_LEADER' : 'MEMBER',
    }))

    res.status(200).json(result) // 元のレスポンス形式に合わせる
})

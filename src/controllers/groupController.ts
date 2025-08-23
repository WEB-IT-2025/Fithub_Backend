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
        back_image || 'default.jpg', // デフォルト画像ファイル名
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
    const updated = await groupModel.updateGroup(group_id, group_name, max_person, back_image || 'default.jpg')
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

// 自己退会（一般メンバーのみ）
export const leaveGroup = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as UserPayload
    const { group_id } = req.body

    const user_id = user.user_id

    // グループ存在確認
    const group = await groupModel.getGroupById(group_id)
    if (!group) {
        return res.status(404).json({ error: 'グループが見つかりません。' })
    }

    // グループリーダーは自己退会できない
    if (group.admin_id === user_id) {
        return res.status(400).json({
            error: 'グループリーダーは退会できません。グループを削除するか、他のメンバーにリーダーを譲渡してください。',
        })
    }

    // メンバーシップ確認
    const isMember = await groupModel.isGroupMember(group_id, user_id)
    if (!isMember) {
        return res.status(400).json({ error: 'あなたはこのグループのメンバーではありません。' })
    }

    // 退会処理
    await groupModel.removeGroupMember(group_id, user_id)

    res.status(200).json({
        message: `${group.group_name}から退会しました`,
        group_id: group.group_id,
        group_name: group.group_name,
    })
})

// ユーザーが所属するグループ一覧（パスパラメータ版）
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
        max_person: g.max_person, // 定員のみ表示
        current_count: g.current_count, // 現在の参加人数を追加
        back_image: g.back_image,
        is_leader: g.admin_id === user_id,
        role: g.admin_id === user_id ? 'GROUP_LEADER' : 'MEMBER',
    }))

    res.status(200).json(result)
})

// 自分が所属するグループ一覧（トークンベース）
export const getMyGroups = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as UserPayload
    const user_id = user.user_id

    const groups = await groupModel.getGroupsByUserId(user_id)

    if (!groups || groups.length === 0) {
        return res.status(200).json([])
    }

    const result = groups.map((g) => ({
        group_id: g.group_id,
        group_name: g.group_name,
        max_person: g.max_person, // 定員のみ表示
        current_count: g.current_count, // 現在の参加人数を追加
        back_image: g.back_image,
        is_leader: g.admin_id === user_id,
        role: g.admin_id === user_id ? 'GROUP_LEADER' : 'MEMBER',
    }))

    res.status(200).json(result)
})

// グループメンバー取得（メインペット情報含む）
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

    const members = await groupModel.getGroupMembersWithPets(group_id)

    // グループリーダー情報とペット情報を含めてレスポンス
    const result = members.map((member) => ({
        user_id: member.user_id,
        user_name: member.user_name,
        user_icon: member.user_icon,
        is_leader: member.user_id === group.admin_id,
        role: member.user_id === group.admin_id ? 'GROUP_LEADER' : 'MEMBER',
        main_pet:
            member.main_pet_name ?
                {
                    pet_name: member.main_pet_name,
                    item_id: member.main_pet_item_id,
                    pet_size: member.pet_size || 1,
                    pet_intimacy: member.pet_intimacy || 0,
                    pet_image: member.pet_image || null,
                }
            :   null,
    }))

    res.status(200).json(result)
})

// グループにメンバー追加（自己参加方式）
export const addGroupMember = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as UserPayload // JWTから取得
    const { group_id } = req.body

    const user_id = user.user_id // 自分自身のIDを使用

    // グループ存在確認
    const group = await groupModel.getGroupById(group_id)
    if (!group) {
        return res.status(404).json({ error: 'グループが見つかりません。' })
    }

    // プライベートグループの場合は自己参加を拒否
    if (!group.group_public) {
        return res.status(403).json({ error: 'プライベートグループには招待が必要です。' })
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

    res.status(200).json({
        message: `${group.group_name}に参加しました`,
    })
})

// 公開グループ検索
export const getPublicGroups = asyncHandler(async (req: Request, res: Response) => {
    const { search, limit = 20 } = req.query

    const groups = await groupModel.searchPublicGroups(search as string, parseInt(limit as string))

    const result = groups.map((g) => ({
        group_id: g.group_id,
        group_name: g.group_name,
        max_person: g.max_person, // 定員のみ表示
        back_image: g.back_image,
        current_count: g.current_count,
        is_full: g.current_count >= g.max_person,
    }))

    res.status(200).json(result)
})

// グループメンバー招待（グループリーダー限定）
export const inviteGroupMember = asyncHandler(async (req: Request, res: Response) => {
    const { group_id, user_id } = req.body

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

    // 招待されるユーザーが存在するかチェック
    const targetUser = await groupModel.getUserById(user_id)
    if (!targetUser) {
        return res.status(404).json({ error: '招待するユーザーが見つかりません。' })
    }

    await groupModel.addGroupMember(group_id, user_id)

    res.status(200).json({
        message: `${targetUser.user_name}を${group.group_name}に招待しました`,
        group_id: group.group_id,
        group_name: group.group_name,
        invited_user: {
            user_id: targetUser.user_id,
            user_name: targetUser.user_name,
        },
    })
})

// 招待コード生成（グループリーダー限定）
export const generateInviteCode = asyncHandler(async (req: Request, res: Response) => {
    const { group_id } = req.body

    // グループ存在確認
    const group = await groupModel.getGroupById(group_id)
    if (!group) {
        return res.status(404).json({ error: 'グループが見つかりません。' })
    }

    // 重複しない招待コードを生成
    let inviteCode: string
    let attempts = 0
    do {
        inviteCode = groupModel.generateInviteCode()
        attempts++
        if (attempts > 10) {
            return res.status(500).json({ error: '招待コードの生成に失敗しました。' })
        }
    } while (await groupModel.isInviteCodeExists(inviteCode))

    // 招待コードを設定
    await groupModel.setInviteCode(group_id, inviteCode)

    res.status(200).json({
        message: '招待コードを生成しました',
        invite_code: inviteCode,
        group_id: group.group_id,
        group_name: group.group_name,
    })
})

// 招待コードでグループ参加
export const joinByInviteCode = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as UserPayload
    const { invite_code } = req.body

    const user_id = user.user_id

    // 招待コードでグループ取得
    const group = await groupModel.getGroupByInviteCode(invite_code)
    if (!group) {
        return res.status(404).json({ error: '無効な招待コードです。' })
    }

    // 定員チェック
    const currentMemberCount = await groupModel.getGroupMemberCount(group.group_id)
    if (currentMemberCount >= group.max_person) {
        return res.status(400).json({ error: 'グループの定員に達しています。' })
    }

    // 既存メンバーチェック
    const isAlreadyMember = await groupModel.isGroupMember(group.group_id, user_id)
    if (isAlreadyMember) {
        return res.status(400).json({ error: '既にグループのメンバーです。' })
    }

    await groupModel.addGroupMember(group.group_id, user_id)

    res.status(200).json({
        message: `招待コードで${group.group_name}に参加しました`,
        group_id: group.group_id,
        group_name: group.group_name,
    })
})

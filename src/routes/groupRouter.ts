// src/routes/groupRouter.ts（ミドルウェア保護版）
import express from 'express'
import {
    addGroupMember,
    adminDeleteGroup,
    createGroup,
    deleteGroup,
    generateInviteCode,
    getGroupMembers,
    getMyGroups,
    getPublicGroups,
    inviteGroupMember,
    joinByInviteCode,
    leaveGroup,
    removeGroupMember,
    updateGroup,
} from '~/controllers/groupController'
import { authenticateJWT } from '~/middlewares/authenticateJWT'
import { requireAdmin } from '~/middlewares/requireAdmin'
import { requireGroupLeader } from '~/middlewares/requireGroupLeader'
import {
    handleValidationErrors,
    validateGroupCreation,
    validateGroupDelete,
    validateGroupUpdate,
    validateInviteCodeGeneration,
    validateInviteCodeJoin,
    validateInviteOperation,
    validateMemberOperation,
} from '~/middlewares/validation/groupValidation'

const router = express.Router()

// グループ基本操作（グループリーダー限定）
router.post('/create', authenticateJWT, validateGroupCreation, handleValidationErrors, createGroup)

router.put(
    '/update',
    authenticateJWT,
    validateGroupUpdate,
    handleValidationErrors,
    requireGroupLeader, // グループリーダー権限チェック
    updateGroup
)

router.delete(
    '/delete',
    authenticateJWT,
    validateGroupDelete,
    handleValidationErrors,
    requireGroupLeader, // グループリーダー権限チェック
    deleteGroup
)

// システム管理者専用操作
router.delete(
    '/admin-delete',
    validateGroupDelete,
    handleValidationErrors,
    requireAdmin, // システム管理者権限チェック
    adminDeleteGroup
)

// 所属グループ一覧取得（トークンベース）
router.get('/member/userlist', authenticateJWT, getMyGroups)

// 公開グループ検索
router.get('/search', authenticateJWT, getPublicGroups)

// グループメンバー操作
router.post('/members/join', authenticateJWT, validateMemberOperation, handleValidationErrors, addGroupMember)

router.post(
    '/members/invite',
    authenticateJWT,
    validateInviteOperation,
    handleValidationErrors,
    requireGroupLeader,
    inviteGroupMember
)

// 招待コード機能
router.post(
    '/invite-code/generate',
    authenticateJWT,
    validateInviteCodeGeneration,
    handleValidationErrors,
    requireGroupLeader,
    generateInviteCode
)

router.post('/invite-code/join', authenticateJWT, validateInviteCodeJoin, handleValidationErrors, joinByInviteCode)

router.get('/members/list/:group_id', authenticateJWT, getGroupMembers)

router.delete(
    '/members/remove',
    validateMemberOperation,
    handleValidationErrors,
    requireGroupLeader, // グループリーダー権限チェック
    removeGroupMember
)

// 自己退会
router.delete('/members/leave/:group_id', authenticateJWT, leaveGroup)

export default router

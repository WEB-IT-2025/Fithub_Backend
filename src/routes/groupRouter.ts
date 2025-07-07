import express from 'express'
import { adminDeleteGroup, createGroup, deleteGroup, updateGroup } from '~/controllers/groupController'
import { requireAdmin } from '~/middlewares/requireAdmin'
import { handleValidationErrors } from '~/middlewares/validation'
import {
    validateGroupCreation,
    validateGroupDelete,
    validateGroupUpdate,
} from '~/middlewares/validation/groupValidation'

const router = express.Router()

router.post('/create', validateGroupCreation, handleValidationErrors, createGroup)
router.put('/update', validateGroupUpdate, handleValidationErrors, updateGroup)
router.delete('/delete', validateGroupDelete, handleValidationErrors, deleteGroup)
router.delete('/admin-delete', requireAdmin, validateGroupDelete, handleValidationErrors, adminDeleteGroup)

export default router

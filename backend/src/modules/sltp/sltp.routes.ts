import { Router } from 'express'
import sltpController from './sltp.controllers'

const router = Router({mergeParams:true})



router.patch('/', sltpController.setSltp)
router.delete('/', sltpController.removeSltp)

export default router
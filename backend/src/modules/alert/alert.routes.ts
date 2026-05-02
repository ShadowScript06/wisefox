import express from "express";
import alertController from "./alert.controllers";
import { validate } from "../../middlewares/inputvalidator";
import createAlertSchema from "../../config/validations/alert/createAlertSchema";

const router=express.Router();

router.post('/',validate(createAlertSchema),alertController.createAlert);

router.get('/',alertController.getAllAlerts);

router.delete('/:alertId',alertController.deleteAlert);

router.patch('/:alertId',alertController.editAlert);


export default router;
import express from "express";
import orderController from "./order.controller";
import { validate } from "../../middlewares/inputvalidator";
import createOrderSchema from "../../config/validations/order/createOrderSchema";
const router=express.Router({ mergeParams: true });

export default router;

router.post('/',validate(createOrderSchema), orderController.placeOrder);

router.delete('/:orderId',orderController.cancelOrder);

router.get('/', orderController.getAllOrders);

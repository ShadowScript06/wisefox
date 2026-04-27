import express from "express";
import accountController from "./account.controller";
import { authMiddleware } from "../../middlewares/auth";
import { validate } from "../../middlewares/inputvalidator";
import { createAccountSchema } from "../../config/validations/account/createAccountSchema";

const router=express.Router();

router.post('/',validate(createAccountSchema),accountController.createAccount);

router.get('/',accountController.getAllAccounts);

router.get('/:id',accountController.getAccountById);

router.delete('/:id',accountController.deleteAccount);


export default router;

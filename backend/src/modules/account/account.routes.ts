import express from "express";
import accountController from "./account.controller";
import { validate } from "../../middlewares/inputvalidator";
import { createAccountSchema } from "../../config/validations/account/createAccountSchema";
import { checkPlanLimit } from "../../middlewares/checkPlanLimit";
import { checkAccountBalance } from "../../middlewares/checkAccountBalance";
import { checkAiAccess } from "../../middlewares/checkAiAccess";

const router=express.Router({mergeParams:true});

router.post('/',checkPlanLimit("ACCOUNT"),checkAccountBalance,validate(createAccountSchema),accountController.createAccount);

router.get('/',accountController.getAllAccounts);

router.get('/:id',accountController.getAccountById);

router.delete('/:id',accountController.deleteAccount);

router.get('/:id/overview',accountController.getAccountOverview);

router.post("/:id/ai-feedback/generate", checkAiAccess,accountController.generateAiFeedback);

// Get latest AI feedback by accountId
router.get("/:id/ai-feedback", accountController.getAiFeedback);


export default router;

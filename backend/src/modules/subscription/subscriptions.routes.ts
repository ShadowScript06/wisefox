import express from "express";
import subscriptionController from "./subscriptions.controllers";
import subscriptionServices from "./subscriptions.services";

const router=express.Router();

router.get('/',subscriptionController.getActivePlan);

router.post(
  "/upgrade",
  subscriptionController.createUpgradeOrder
);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  subscriptionServices.handleWebhook
);

export default router;
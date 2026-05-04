import express from "express";
import subscriptionController from "./subscriptions.controllers";

const router=express.Router();

router.post(
  "/upgrade",
  subscriptionController.createUpgradeOrder
);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  subscriptionController.handleWebhook
);

export default router;
import express from "express";
import positionsController from "./position.controllers";

const router=express.Router({mergeParams:true});

router.get('/', positionsController.getPositions);

router.get('/trades',positionsController.getTradeHistory);

router.get('/pnl', positionsController.getPnlSummary);

router.get('/margin', positionsController.getMarginStatus)


router.get('/audit',positionsController. getAuditLog)


export default router;
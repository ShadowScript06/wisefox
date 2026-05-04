import { Request, Response, NextFunction } from "express";
import subscritionServices from "../modules/subscription/subscriptions.services";

export const checkAccountBalance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any).id;
    const { balance } = req.body;

    const plan = await subscritionServices.getActivePlan(userId);

    const maxBalance = plan.initialBalance ?? -1;

    // unlimited plan
    if (maxBalance === -1) {
      return next();
    }

    // validation
    if (balance > maxBalance) {
      return res.status(403).json({
        message: `Balance exceeds plan limit. Max allowed: ${maxBalance}`,
      });
    }

    return next();
  } catch (err) {
    return res.status(500).json({
      message: "Balance validation failed",
    });
  }
};
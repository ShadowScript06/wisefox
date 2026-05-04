import { Request, Response, NextFunction } from "express";
import subscritionServices from "../modules/subscription/subscriptions.services";

export const checkPlanLimit = (
  type: "TRADE" | "JOURNAL" | "ACCOUNT"
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req.user as any).id;

      const plan = await subscritionServices.getActivePlan(userId);

      let limit: number = -1; // default unlimited-safe

      if (type === "TRADE") {
        limit = plan.tradesPerDay ?? -1;
      }

      if (type === "JOURNAL") {
        limit = plan.journalsPerDay ?? -1;
      }

      if (type === "ACCOUNT") {
        limit = plan.maxAccounts ?? -1;
      }

      // unlimited case
      if (limit === -1) {
        return next();
      }

      // attach safely
      (req as any).planLimit = limit;

      return next();
    } catch (err) {
      return res.status(403).json({
        message: "Plan validation failed",
      });
    }
  };
};
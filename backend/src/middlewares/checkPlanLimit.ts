import { Request, Response, NextFunction } from "express";
import subscritionServices from "../modules/subscription/subscriptions.services";
import { prisma } from "../lib/prisma";

export const checkPlanLimit = (
  type: "TRADE" | "JOURNAL" | "ACCOUNT"
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req.user as any).id;

      const plan = await subscritionServices.getActivePlan(userId);

      let limit = -1;

      if (type === "TRADE") limit = plan.tradesPerDay ?? -1;
      if (type === "JOURNAL") limit = plan.journalsPerDay ?? -1;
      if (type === "ACCOUNT") limit = plan.maxAccounts ?? -1;

      // ✅ Unlimited plan
      if (limit === -1) return next();

      // =========================
      // 🔹 ACCOUNT (total limit)
      // =========================
      if (type === "ACCOUNT") {
        const accountCount = await prisma.account.count({
          where: { userId },
        });

        if (accountCount >= limit) {
          return res.status(403).json({
            success: false,
            message: "Account limit reached",
          });
        }

        return next();
      }

      // =========================
      // 🔹 DAILY USAGE (TRADE/JOURNAL)
      // =========================
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);

      const end = new Date();
      end.setUTCHours(23, 59, 59, 999);

      const usage = await prisma.dailyUsage.findFirst({
        where: {
          userId,
          date: {
            gte: start,
            lte: end,
          },
        },
      });

      const current =
        type === "TRADE"
          ? usage?.tradesCount ?? 0
          : usage?.journalsCount ?? 0;

      if (current >= limit) {
        return res.status(403).json({
          success: false,
          message: `${type} daily limit reached`,
        });
      }

      return next();
    } catch (err) {
      return res.status(500).json({
        message: "Plan validation failed",
      });
    }
  };
};
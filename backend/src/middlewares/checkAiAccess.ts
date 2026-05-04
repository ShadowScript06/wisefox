import { Request, Response, NextFunction } from "express";
import subscritionServices from "../modules/subscription/subscriptions.services";

export const checkAiAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any).id;

    const plan = await subscritionServices.getActivePlan(userId);

    if (!plan.aiFeedbackEnabled) {
      return res.status(403).json({
        message: "AI Summary is not available in your plan",
      });
    }

    return next();
  } catch (err) {
    return res.status(500).json({
      message: "AI access check failed",
    });
  }
};
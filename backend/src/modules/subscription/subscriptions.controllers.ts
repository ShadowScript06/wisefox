import { razorpay } from "../../config/razorpay/razorpay";

import { Request,Response } from "express";
type PlanName = "PRO" | "PREMIUM";
const PLAN_PRICES: Record<PlanName, number> = {
  PRO: 999,
  PREMIUM: 1999,
};
import subscritionServices from "./subscriptions.services";

export const  getActivePlan=async(request:Request,response:Response)=>{
  try {
    const userId = (request.user as any).id;
    const plan=await subscritionServices.getActivePlan(userId);

    response.status(200).json({
      success:true,
      message:"Plan Fetched",
      data:plan
    })
  } catch (error) {
     console.log(error);
        response.status(500).json({
            success:false,
            message:"Internal server error."
        })
  }
}

export const createUpgradeOrder = async (request:Request, response:Response) => {
    try {
         const userId = (request.user as any).id;
 

  const { planName } = request.body as {
  planName: PlanName;
};
const amount = PLAN_PRICES[planName];

  if (!amount) {
    return response.status(400).json({ message: "Invalid plan" });
  }

  const order = await razorpay.orders.create({
    amount: amount * 100, // paise
    currency: "INR",
    receipt: `rcpt_${Date.now()}`,
    notes: {
      userId,
      planName,
    },
  });

  return response.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    key: process.env.RAZORPAY_KEY_ID,
  });
    } catch (error) {
        console.log(error);
        response.status(500).json({
            success:false,
            message:"Internal server error."
        })
    }
 
};

const subscriptionController={
  getActivePlan,
    createUpgradeOrder
}

export default subscriptionController;
import { Request,Response } from "express";
import { prisma } from "../../lib/prisma";
import crypto from "crypto";

const getActivePlan = async (userId: string) => {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },
    include: {
      plan: true,
    },
  });

  if (!subscription) {
    throw new Error("No active subscription found");
  }

  return subscription.plan;
};





type RazorpayWebhookEvent = {
  event: string;
  payload: {
    payment: {
      entity: {
        notes: {
          userId: string;
          planName: "PRO" | "PREMIUM";
        };
      };
    };
  };
};

export const handleWebhook = async (
  request: Request,
  response: Response
): Promise<Response> => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;

    // Razorpay sends raw body (Buffer)
    const rawBody = request.body as Buffer;

    // Signature from headers
    const signature = request.headers["x-razorpay-signature"] as string;

    // Generate digest
    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(rawBody);
    const digest = shasum.digest("hex");

    // Verify signature
    if (digest !== signature) {
      return response.status(400).json({
        message: "Invalid signature",
      });
    }

    // Parse event
    const event: RazorpayWebhookEvent = JSON.parse(rawBody.toString());

    // Handle payment success
    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;

      const { userId, planName } = payment.notes;
        
      // Find plan
      const plan = await prisma.plan.findFirst({
        where: { name: planName },
      });

      if (!plan) {
        return response.status(400).json({
          message: "Plan not found",
        });
      }

      // Deactivate current subscription
      await prisma.subscription.updateMany({
        where: {
          userId,
          status: "ACTIVE",
        },
        data: {
          status: "INACTIVE",
        },
      });

      // Create new subscription
      await prisma.subscription.create({
        data: {
          userId,
          planId: plan.id,
          status: "ACTIVE",
          startDate: new Date(),
          endDate: new Date("2099-12-31"),
        },
      });
    }

    return response.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return response.status(500).json({
      message: "Webhook failed",
    });
  }
};

const subscritionServices={
    getActivePlan,
    handleWebhook
}

export default subscritionServices;


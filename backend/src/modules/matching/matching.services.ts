import redisClients from "../../config/redis/redis";
import {  Order } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { getLivePrice } from "../../utils/fetchPrices/price.utils";
import { calcRequiredMargin } from "../../utils/margin.utils";
import positionServices from "../position/position.service";

function shouldFill(order: Order, currentPrice: number): boolean {
  if (order.type === "MARKET") return true;

  if (!order.price) return false;

  if (order.direction === "LONG") return currentPrice <= order.price;

  if (order.direction === "SHORT") return currentPrice >= order.price;

  return false;
}

async function matchOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
  });

  if (!order) throw new Error("Order not found.");

  if (order.status !== "PENDING") {
    return;
  }

  if (order.expiresAt && order.expiresAt <= new Date()) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "EXPIRED" },
    });
    return;
  }

  const currentPrice = getLivePrice(order.symbol);

  if (!shouldFill(order, currentPrice)) return;

  // --- fill the order --
  await prisma.$transaction(async (tx) => {
    // 1. fetch account with row-level lock (prevents race conditions)
    const account = await tx.$queryRaw<
      { id: string; balance: number; marginUsed: number }[]
    >`
    SELECT id, balance, "marginUsed"
    FROM "Account"
    WHERE id = ${order.accountId}
    FOR UPDATE
  `;

    if (!account[0]) throw new Error("Account not found");

    const { balance, marginUsed } = account[0];

    const requiredMargin = calcRequiredMargin(
      order.quantity,
      currentPrice,
      order.leverage,
    );

    const freeMargin = balance - marginUsed;

    // 2. margin check
    if (requiredMargin > freeMargin) {
      // cancel the order — not enough margin
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      console.log(
        `Order ${order.id} cancelled — insufficient margin. Required: ${requiredMargin}, Free: ${freeMargin}`,
      );
      return;
    }

    // 3. create trade
    const trade = await tx.trade.create({
      data: {
        orderId: order.id,
        accountId: order.accountId,
        symbol: order.symbol,
        direction: order.direction,
        quantity: order.quantity,
        price: currentPrice,
      },
    });

    // 4. mark order filled
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "FILLED",
        filledQty: order.quantity,
        filledPrice: currentPrice,
      },
    });

    const existingPosition = await tx.position.findFirst({
      where: {
        accountId: trade.accountId,
        symbol: trade.symbol,
        isOpen: true,
      },
    });

    if (!existingPosition || existingPosition.direction === trade.direction ) {
      // 5. reserve margin on account
      await tx.account.update({
        where: { id: order.accountId },
        data: {
          marginUsed: { increment: requiredMargin },
          balance: { decrement: requiredMargin },
        },
      });
    }
    // 6. process into position (pass leverage + marginUsed)
    await positionServices.processTradeIntoPosition(
      {
        id: trade.id,
        accountId: order.accountId,
        symbol: order.symbol,
        direction: order.direction,
        quantity: order.quantity,
        price: currentPrice,
        leverage: order.leverage,
        marginUsed: requiredMargin,
      },
      tx,
    );

    if (order.isBracket && (order.slPrice || order.tpPrice)) {
      const position = await tx.position.findFirst({
        where: {
          accountId: order.accountId,
          symbol: order.symbol,
          isOpen: true,
        },
      });

      if (position) {
        await tx.position.update({
          where: { id: position.id },
          data: {
            slPrice: order.slPrice ?? null,
            slQty: order.slQty ?? null,
            tpPrice: order.tpPrice ?? null,
            tpQty: order.tpQty ?? null,
          },
        });
      }
    }
  });
}
async function matchPendingOrders(): Promise<void> {
  const order = (await redisClients.consumer.brpop("orders", 0)) as any;

  const orderId = order[1];

  if (orderId) {
    await matchOrder(orderId).catch((err) => {
      console.error(`Failed to match order ${orderId}:`, err.message);
    });
  }
}

const matchingServices = {
  matchPendingOrders,
  matchOrder,
};

export default matchingServices;

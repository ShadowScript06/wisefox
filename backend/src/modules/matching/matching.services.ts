import redisClients from "../../config/redis/redis";
import { Order, Position } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { upsertAccount } from "../../utils/cache/accountCache";
import pendingOrders from "../../utils/cache/orderCache";
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

function isClosingOrder(position: Position | null, order: Order): boolean {
  if (!position) return false;

  return (
    position.symbol === order.symbol &&
    position.direction !== order.direction &&
    position.quantity >= order.quantity && 
    order.type==="MARKET"
  );
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

    const existingPosition = await tx.position.findFirst({
      where: {
        accountId: order.accountId,
        symbol: order.symbol,
        isOpen: true,
      },
    });
    const { balance, marginUsed } = account[0];

    const requiredMargin = calcRequiredMargin(
      order.quantity,
      currentPrice,
      order.leverage,
    );

    const freeMargin = balance;

    // 1. If this is a closing order → ALWAYS allow
    if (isClosingOrder(existingPosition, order)) {
      // proceed to close logic (no margin check)
    } else {
      // 2. Only opening / increasing needs margin check
      if (requiredMargin > freeMargin) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED", cancelledAt: new Date() },
        });

        console.log(
          `Order ${order.id} cancelled — insufficient margin. Required: ${requiredMargin}, Free: ${freeMargin}`,
        );

        return;
      }
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

    if (!existingPosition || existingPosition.direction === trade.direction) {
      // 5. reserve margin on account
      const updatedAccount=await tx.account.update({
        where: { id: order.accountId },
        data: {
          marginUsed: { increment: requiredMargin },
          balance: { decrement: requiredMargin },
        },
      });
       upsertAccount(updatedAccount);
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
        slPrice:order.slPrice,
        tpPrice:order.tpPrice
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
            tpPrice: order.tpPrice ?? null,
          },
        });
      }
    }
  });
}

async function matchPendingOrders(): Promise<void> {
  const orders = [...pendingOrders];
  for (const order of orders) {
    if (order.id) {
      await matchOrder(order.id).catch((err) => {
        console.error(`Failed to match order ${order.id}:`, err.message);
      });
    }
  }

  pendingOrders.splice(
    0,
    pendingOrders.length,
    ...pendingOrders.filter((order) => order.status === "PENDING"),
  );
}

const matchingServices = {
  matchPendingOrders,
  matchOrder,
};

export default matchingServices;

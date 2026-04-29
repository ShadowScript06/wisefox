
import redisClients from "../../config/redis/redis";
import {
  Direction,
  OrderStatus,
  orderType,
} from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";

import matchingServices from "../matching/matching.services";

interface PlaceOrderInput {
  accountId: string;
  symbol: string;
  direction: Direction;
  type: orderType;
  quantity: number;
  price: number;
  ttlSeconds?: number;
  leverage: number;
  slPrice?: number;
  slQty?: number;
  tpPrice?: number;
  tpQty?: number;
  isBracket?: boolean;
}

const placeOrder = async (input: PlaceOrderInput) => {
  const {
    accountId,
    symbol,
    direction,
    type,
    quantity,
    price,
    ttlSeconds,
    leverage,
    slPrice,
    slQty,
    tpPrice,
    tpQty,
  } = input;

  if (type === "LIMIT" && !price) {
    throw new Error("Limit orders require a price");
  }

  const expiresAt = ttlSeconds
    ? new Date(Date.now() + ttlSeconds * 1000)
    : null;

  const account = await prisma.account.findUnique({
    where: {
      id: accountId,
    },
  });

  if (!account) {
    throw new Error("Account does not exist");
  }
  const order = await prisma.order.create({
    data: {
      accountId,
      symbol,
      direction,
      type,
      quantity,
      price,
      expiresAt,
      leverage,
      slPrice,
      slQty,
      tpPrice,
      tpQty,
      isBracket: !!(slPrice || tpPrice),
    },
  });


   await matchingServices.matchOrder(order.id).catch((err) => {
      console.error(`Failed to match order ${order.id}:`, err.message);
    });
  
  // redisClients.producer.lpush('orders',String(order.id));

  // matchingServices
  //   .matchOrder(order.id)
  //   .catch((err) =>
  //     console.error(`matchOrder failed for ${order.id}:`, err.message),
  //   );

  return order;
};

interface CancelOrderInput {
  accountId: string;
  orderId: string;
}
const cancelOrder = async (input: CancelOrderInput) => {
  const { accountId, orderId } = input;
  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
  });

  if (!order) throw new Error("Order not found");
  if (order.accountId !== accountId) throw new Error("Unauthorized");
  if (order.status !== "PENDING") {
    throw new Error(`Cannot cancel order in status: ${order.status}`);
  }

  return prisma.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
};

const getOrders = async (
  accountId: string,
  status: OrderStatus | undefined,
) => {
  return prisma.order.findMany({
    where: {
      accountId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { trades: true },
  });
};

async function expireOrders(): Promise<number> {
  const result = await prisma.order.updateMany({
    where: {
      status: "PENDING",
      expiresAt: { lte: new Date() },
    },
    data: { status: "EXPIRED" },
  });
  return result.count;
}
const orderServices = {
  placeOrder,
  cancelOrder,
  getOrders,
  expireOrders,
};

export default orderServices;

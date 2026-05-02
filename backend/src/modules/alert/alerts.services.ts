import { prisma } from "../../lib/prisma";
import { Alert, AlertStatus, AlertType } from "../../generated/prisma/client";
import {
  upsertAlert,
  removeAlert,
  getUserAlerts,
  getAllAlerts,
} from "../../utils/cache/alertCache";
import { getLivePrice } from "../../utils/fetchPrices/price.utils";
import run from "../../workers/emailWorker";

interface AlertTriggeredEvent {
  alertId: string;
  userId: string;
  email: string;
  symbol: string;
  price: number;
  target: number;
  triggeredAt: number;
  name:string
}

export const createAlert = async (data: {
  name: string;
  userId: string;
  price: number;
  type: any;
  symbol: string;
}): Promise<Alert> => {
  const alert = await prisma.alert.create({
    data: {
      ...data,
      status: AlertStatus.PENDING,
    },
  });

  // ✅ sync cache
  upsertAlert(alert.userId, alert);

  return alert;
};

const editAlert = async (
  updates: {
    name?: string;
    price?: number;
    type?: AlertType;
  },
  userId: string,
  alertId: string,
): Promise<Alert | null> => {
  // 🔍 Check ownership + existence
  const existing = await prisma.alert.findUnique({
    where: { id: alertId },
  });

  if (!existing || existing.userId !== userId) {
    return null;
  }

  // 🧠 Build safe update object (ignore undefined)
  const updateData: Partial<Alert> = {};

  if (updates.name !== undefined) {
    updateData.name = updates.name;
  }

  if (updates.price !== undefined) {
    updateData.price = updates.price;
  }

  if (updates.type !== undefined) {
    updateData.type = updates.type;
  }

  // ⚠️ Nothing to update
  if (Object.keys(updateData).length === 0) {
    return existing;
  }

  // 🔄 Update DB
  const updated = await prisma.alert.update({
    where: { id: alertId },
    data: updateData,
  });

  // ✅ Sync cache
  upsertAlert(userId, updated);

  return updated;
};

const getAllAlert = async (userId: string): Promise<Alert[]> => {
  // ⚡ try cache first
  const cached = getUserAlerts(userId);

  if (cached.length > 0) {
    return cached;
  }

  // fallback to DB
  const alerts = await prisma.alert.findMany({
    where: { userId },
  });

  // ✅ populate cache
  for (const alert of alerts) {
    upsertAlert(userId, alert);
  }

  return alerts;
};

/**
 * 🔹 DELETE ALERT
 */
export const deleteAlert = async (
  alertId: string,
  userId: string,
): Promise<boolean> => {
  // 🔍 check ownership

  const existing = await prisma.alert.findUnique({
    where: { id: alertId },
  });

  if (!existing || existing.userId !== userId) {
    return false;
  }

  await prisma.alert.delete({
    where: { id: alertId },
  });

  // ✅ remove from cache
  removeAlert(userId, alertId);

  return true;
};

const checkTriggeredAlerts = async (
  sendToUser: (userId: string, payload: any) => void,
): Promise<void> => {
  const alerts = getAllAlerts();

  for (const alert of alerts) {
    if (alert.status !== "PENDING") continue;

    const currentPrice = getLivePrice(alert.symbol);

    console.log(currentPrice);
    if (!currentPrice) continue;

    let isTriggered = false;

    if (alert.type === "GTE" && currentPrice >= alert.price) {
      isTriggered = true;
    }

    if (alert.type === "LTE" && currentPrice <= alert.price) {
      isTriggered = true;
    }

    if (alert.type === "ET" && currentPrice === alert.price) {
      isTriggered = true;
    }

    if (!isTriggered) continue;

    // 🔥 update DB
    const updated = await prisma.alert.update({
      where: { id: alert.id },
      data: { status: AlertStatus.TRIGGERED },
    });

    // ✅ update cache
    upsertAlert(alert.userId, updated);
    removeAlert(alert.userId, alert.id);

    const date=new  Date();
    // 🚀 send via WS
    sendToUser(alert.userId, {
      type: "ALERT_TRIGGERED",
      data: {
        id: updated.id,
        symbol: updated.symbol,
        price: updated.price,
        currentPrice,
        type: updated.type,
      },
      message:`Price alert hit: ${alert.symbol} : ${alert.price} at ${date.toLocaleTimeString()} `
    });

    const user = await prisma.user.findUnique({
      where: {
        id: alert.userId,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const event: AlertTriggeredEvent = {
      alertId: alert.id,
      userId: alert.userId,
      email: user?.email,
      symbol: alert.symbol,
      price: currentPrice,
      target: alert.price,
      triggeredAt: Date.now(),
      name:alert.name
    };

    run(event);
  }
};

const alertServices = {
  createAlert,
  editAlert,
  getAllAlert,
  deleteAlert,
  checkTriggeredAlerts,
};

export default alertServices;

import { Alert } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

/**
 * Structure:
 * Map<userId, Map<alertId, Alert>>
 */
const cachedAlerts = new Map<string, Map<string, Alert>>();

/**
 * 🔹 Get ALL alerts (flattened)
 */
export function getAllAlerts(): Alert[] {
  const allAlerts: Alert[] = [];

  for (const userAlerts of cachedAlerts.values()) {
    allAlerts.push(...userAlerts.values());
  }

  return allAlerts;
}

/**
 * 🔹 Get alerts for a specific user
 */
export function getUserAlerts(userId: string): Alert[] {
  const userAlerts = cachedAlerts.get(userId);
  if (!userAlerts) return [];

  return Array.from(userAlerts.values());
}

/**
 * 🔹 Get single alert
 */
export function getAlert(userId: string, alertId: string): Alert | null {
  return cachedAlerts.get(userId)?.get(alertId) || null;
}

/**
 * 🔹 Create or Update alert
 */
export function upsertAlert(userId: string, alert: Alert) {
  let userAlerts = cachedAlerts.get(userId);

  if (!userAlerts) {
    userAlerts = new Map<string, Alert>();
    cachedAlerts.set(userId, userAlerts);
  }

  userAlerts.set(alert.id, alert);
}

/**
 * 🔹 Remove alert
 */
export function removeAlert(userId: string, alertId: string) {
  const userAlerts = cachedAlerts.get(userId);
  if (!userAlerts) return;

  userAlerts.delete(alertId);

  // cleanup empty user map
  if (userAlerts.size === 0) {
    cachedAlerts.delete(userId);
  }
}

/**
 * 🔹 Replace all alerts for a user (useful after DB fetch)
 */
export function setUserAlerts(userId: string, alerts: Alert[]) {
  const map = new Map<string, Alert>();

  for (const alert of alerts) {
    map.set(alert.id, alert);
  }

  cachedAlerts.set(userId, map);
}

/**
 * 🔹 Clear entire cache
 */
export function clearAlerts() {
  cachedAlerts.clear();
}

/**
 * 🔥 FULL REFRESH FROM DB (IMPORTANT)
 * Call this:
 * - on server start
 * - periodically (optional)
 */
export async function refreshAlertsCache() {
  try {
    console.log("Refreshing alerts cache from DB...");

    const alerts = await prisma.alert.findMany();

    // clear existing cache
    cachedAlerts.clear();

    // rebuild cache
    for (const alert of alerts) {
      const userId = alert.userId;

      if (!cachedAlerts.has(userId)) {
        cachedAlerts.set(userId, new Map());
      }

      cachedAlerts.get(userId)!.set(alert.id, alert);
    }

    console.log(`Alerts cache refreshed: ${alerts.length} alerts loaded.`);
  } catch (err: any) {
    console.error("Error refreshing alerts cache:", err.message);
  }
}
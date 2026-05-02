import { app } from "./app";
import dotenv from "dotenv";
import http from "http";
import { getPrices, basePrices } from "./utils/fetchPrices/ws";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import * as cookie from "cookie";
import { generateLivePrices } from "./utils/fetchPrices/generateLive";
import matchingServices from "./modules/matching/matching.services";
import orderServices from "./modules/order/order.services";
import { prisma } from "./lib/prisma";
import pnlServices from "./modules/pnl/pnl.services";
import liquidationService from "./modules/liquidation/liquidation.services";
import sltpService from "./modules/sltp/sltp.services";
import { refreshPendingOrdersCache } from "./utils/cache/orderCache";
import { refreshPositionsCache } from "./utils/cache/positionCache";
import { refreshAccountsCache } from "./utils/cache/accountCache";
import { refreshAlertsCache } from "./utils/cache/alertCache";
import alertServices from "./modules/alert/alerts.services";


dotenv.config();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const sendToUser = (userId: string, payload: any) => {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    if ((client as any).userId === userId) {
      client.send(JSON.stringify(payload));
    }
  }
};

export let livePrices: Record<string, number> = {};

const wss = new WebSocketServer({ server });

/**
 * 🔌 WebSocket Connection
 */
wss.on("connection", async (client, req) => {
  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const token = cookies.token;

    if (!token) {
      client.close();
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
      email: string;
    };

    // 🔹 Try to get account (optional)
    const account = await prisma.account.findFirst({
      where: { userId: decoded.userId },
    });

    (client as any).userId = decoded.userId;
    (client as any).accountId = account?.id || null;

    console.log("User connected:", decoded.userId);

    // 🔹 Send initial snapshot
    client.send(JSON.stringify({ type: "SNAPSHOT", data: livePrices }));
  } catch (err) {
    console.log("WS auth error:", err);
    client.close();
  }
});

/**
 * 🔁 MAIN LOOP (every 2s)
 */
setInterval(async () => {
  try {
    // 1. Generate new prices
    livePrices = generateLivePrices(basePrices, livePrices);

    // 2. Per-client updates
    for (const client of wss.clients) {
      if (client.readyState !== WebSocket.OPEN) continue;

      const userId = (client as any).userId;
      let accountId = (client as any).accountId;

      // ✅ Always send price tick
      client.send(JSON.stringify({ type: "TICK", data: livePrices }));

      // 🔄 If account was not present earlier, check again
      if (!accountId && userId) {
        const account = await prisma.account.findFirst({
          where: { userId },
        });

        if (account) {
          (client as any).accountId = account.id;
          accountId = account.id;

          client.send(
            JSON.stringify({
              type: "ACCOUNT_CONNECTED",
              message: "Trading account linked successfully",
            })
          );
        }
      }

      // 🔐 Only run trading logic if account exists
      if (accountId) {
        // 📊 Unrealized PnL
        const pnl = await pnlServices
          .getUnrealisedPnlForAccount(accountId)
          .catch(() => []);

        if (pnl.length > 0) {
          client.send(JSON.stringify({ type: "PNL_UPDATE", data: pnl }));
        }

        // ⚠️ Liquidation check
        const { marginCall, liquidated } = await liquidationService
          .checkAndLiquidate(accountId)
          .catch(() => ({ marginCall: false, liquidated: false }));

        if (marginCall) {
          client.send(
            JSON.stringify({
              type: "MARGIN_CALL",
              message:
                "Warning: your margin level is below 100%. Add funds or close positions.",
            })
          );
        }

        if (liquidated) {
          client.send(
            JSON.stringify({
              type: "LIQUIDATED",
              message:
                "Your positions have been liquidated due to insufficient margin.",
            })
          );
        }
      }
    }

    // 🔥 GLOBAL ENGINE (RUN ONCE)
    await orderServices.expireOrders().catch((err) =>
      console.error("expireOrders error:", err.message)
    );

    await matchingServices.matchPendingOrders().catch((err) =>
      console.error("matchPendingOrders error:", err.message)
    );

    await sltpService.checkSLTPForAllPositions().catch((err) =>
      console.error("SLTP check error:", err.message)
    );

    await alertServices.checkTriggeredAlerts(sendToUser).catch((err) =>
      console.error("Alert check error:", err.message)
    );
  } catch (err) {
    console.error("Main loop error:", err);
  }
}, 2000);

/**
 * 🔁 Cache refresh (1 hour)
 */
setInterval(async () => {
  await refreshPendingOrdersCache();
  await refreshAccountsCache();
  await refreshPositionsCache();
  await refreshAlertsCache()
}, 60 * 60 * 1000);






/**
 * 
 * 
 * Server start
 */
server.listen(PORT, async () => {
  getPrices();

  await refreshPendingOrdersCache();
  await refreshAccountsCache();
  await refreshPositionsCache();
  await refreshAlertsCache();

  console.log("Server running on port " + PORT);
});
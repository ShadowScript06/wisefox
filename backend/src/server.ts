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
import sltpService from './modules/sltp/sltp.services'



const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

export let livePrices: Record<string, number> = {};

const wss = new WebSocketServer({ server });

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

    const account = await prisma.account.findFirst({
      where: { userId: decoded.userId },
    });

    if (!account) {
      client.close();
      return;
    }

    (client as any).userId = decoded.userId;
    (client as any).accountId = account.id;

    console.log("User connected:", decoded.userId);

    client.send(JSON.stringify({ type: "SNAPSHOT", data: livePrices }));
  } catch (err) {
    console.log("WS auth error:", err);
    client.close();
  }
});

setInterval(async () => {
  // 1. generate new prices
  livePrices = generateLivePrices(basePrices, livePrices);

  // 2. per client loop
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    const accountId = (client as any).accountId as string | undefined;
    if (!accountId) continue;

    // price tick
    client.send(JSON.stringify({ type: "TICK", data: livePrices }));

    // unrealized PnL
  //   const pnl = await pnlServices
  //     .getUnrealisedPnlForAccount(accountId)
  //     .catch(() => []);

  //   if (pnl.length > 0) {
  //     client.send(JSON.stringify({ type: "PNL_UPDATE", data: pnl }));
  //   }

  //   // liquidation check
  //   const { marginCall, liquidated } = await liquidationService
  //     .checkAndLiquidate(accountId)
  //     .catch(() => ({ marginCall: false, liquidated: false }));

  //   if (marginCall) {
  //     client.send(
  //       JSON.stringify({
  //         type: "MARGIN_CALL",
  //         message:
  //           "Warning: your margin level is below 100%. Add funds or close positions.",
  //       })
  //     );
  //   }

  //   if (liquidated) {
  //     client.send(
  //       JSON.stringify({
  //         type: "LIQUIDATED",
  //         message:
  //           "Your positions have been liquidated due to insufficient margin.",
  //       })
  //     );
  //   }
  // }

  // 3. expire stale orders
  // await orderServices.expireOrders().catch((err) =>
  //   console.error("expireOrders error:", err.message)
  // );

  // 4. match pending orders
  // await matchingServices
  //   .matchPendingOrders()
  //   .catch((err) => console.error("matchPendingOrders error:", err.message));


  //   await sltpService
  // .checkSLTPForAllPositions()
  // .catch((err) => console.error('SLTP check error:', err.message))
  }
}, 2000);

server.listen(PORT, async () => {
  getPrices();
  console.log("Server running on port " + PORT);
});
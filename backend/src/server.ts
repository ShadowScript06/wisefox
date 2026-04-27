import { app } from "./app";
import dotenv from "dotenv";
import http from "http";
import { getPrices, basePrices } from "./utils/fetchPrices/ws";

import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import * as cookie from "cookie";
import { generateLivePrices } from "./utils/fetchPrices/generateLive";

dotenv.config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

let livePrices: Record<string, number> = {};

const wss = new WebSocketServer({ server });

wss.on("connection", (client, req) => {
  try {
    // 1. Parse cookies correctly
    const cookies = cookie.parse(req.headers.cookie || "");

    const token = cookies.token;

    if (!token) {
      client.close();
      return;
    }

    // 2. Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
      email: string;
    };

    // 3. Attach userId
    (client as any).userId = decoded.userId;

    console.log("User connected:", decoded.userId);

    // 4. Send initial data
    client.send(JSON.stringify(basePrices));

    // 5. Live updates
    const interval = setInterval(() => {
      
      if (client.readyState === WebSocket.OPEN) {
        const live = generateLivePrices(basePrices, livePrices);
        livePrices = live;

       

        client.send(
          JSON.stringify({
            type: "TICK",
            data: live,
          }),
        );
      }
    }, 2000);

    // const syncInterval = setInterval(() => {
    //   if (client.readyState === WebSocket.OPEN) {
    //     client.send(
    //       JSON.stringify({
    //         type: "SNAPSHOT",
    //         data: basePrices,
    //       }),
    //     );
    //   }
    // }, 5000);
    

    // 6. Cleanup
    client.on("close", () => {
      console.log("Disconnected:", decoded.userId);
      clearInterval(interval);
    });
  } catch (err) {
    console.log("WS auth error:", err);
    client.close();
  }
});

server.listen(PORT, async () => {
  getPrices();
  console.log("Server running on port " + PORT);
});

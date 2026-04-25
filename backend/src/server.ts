import { app } from "./app";
const dotenv = require("dotenv");
import http from "http";
import { getPrices, prices } from "./utils/fetchPrices/ws";
import { WebSocketServer } from "ws";
dotenv.config();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const wss = new WebSocketServer({ server });

wss.on("connection", (client) => {
  console.log("Frontend Connected");

  // send current prices immediately
  client.send(JSON.stringify(prices));

  const interval = setInterval(() => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(prices));
    }
  }, 1000); // every 1 sec

  client.on("close", () => {
    console.log("Frontend Disconnected");
    clearInterval(interval);
  });
});

server.listen(PORT, async () => {
  getPrices();
  console.log("Server running on port " + PORT);
});

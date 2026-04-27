import WebSocket from "ws";
const dotenv = require("dotenv");
dotenv.config();

export const basePrices: Record<string, number> = {};

export function getPrices() {
  try {
    const WEBSOCKET_URL = process.env.WEBSOCKET_URL;

    if (!WEBSOCKET_URL) {
      console.log("WEBSOCKET_URL missing");
      return;
    }

    const ws = new WebSocket(WEBSOCKET_URL);

    ws.on("open", () => {
      console.log("Connected to Delta India");

      subscribe("v2/ticker", ["BTCUSD", "PAXGUSD"]);
    });

    function subscribe(channel: string, symbols: string[]) {
      ws.send(JSON.stringify({
        type: "subscribe",
        payload: {
          channels: [{ name: channel, symbols }],
        },
      }));
    }

    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "v2/ticker" && msg.symbol) {
        const symbol = msg.symbol;

        const mark = Number(msg.mark_price);

        if (!isNaN(mark)) {
          basePrices[symbol] = mark;
        }
      }
    });

    ws.on("error", console.error);

    ws.on("close", (code, reason) => {
      console.log("Socket closed:", code, reason.toString());
    });

  } catch (error) {
    console.log(error);
  }
}
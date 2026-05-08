import WebSocket from "ws";

const dotenv = require("dotenv");

dotenv.config();

export const basePrices: Record<string, number> = {};

export function getPrices() {
  const WEBSOCKET_URL = process.env.WEBSOCKET_URL;

  if (!WEBSOCKET_URL) {
    console.log("WEBSOCKET_URL missing");
    return;
  }

  let ws: WebSocket | null = null;

  const connect = () => {
    console.log("Connecting to Delta India...");

    let lastMessageTime = Date.now();

    ws = new WebSocket(WEBSOCKET_URL);

    ws.on("open", () => {
      console.log("Connected to Delta India");

      subscribe("v2/ticker", ["BTCUSD", "PAXGUSD"]);
    });

    function subscribe(channel: string, symbols: string[]) {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      ws.send(
        JSON.stringify({
          type: "subscribe",
          payload: {
            channels: [{ name: channel, symbols }],
          },
        })
      );
    }

    ws.on("message", (raw) => {
      try {
        lastMessageTime = Date.now();

        const msg = JSON.parse(raw.toString());

        if (msg.type === "v2/ticker" && msg.symbol) {
          const symbol = msg.symbol;

          const mark = Number(msg.mark_price);

          if (!isNaN(mark)) {
            basePrices[symbol] = mark;
          }
        }
      } catch (err) {
        console.log("Message parse error:", err);
      }
    });

    ws.on("error", (err) => {
      console.log("Delta WS Error:", err);
    });

    // 🔥 Detect stale feed
    const staleCheck = setInterval(() => {
      const diff = Date.now() - lastMessageTime;

      console.log(
        "Last Delta update:",
        Math.floor(diff / 1000),
        "seconds ago"
      );

      if (diff > 15000) {
        console.log("Delta feed stale. Reconnecting...");

        ws?.terminate();
      }
    }, 5000);

    // 🔥 Force refresh every 10 minutes
    const refreshConnection = setInterval(() => {
      console.log("Refreshing Delta websocket connection...");

      ws?.terminate();
    }, 10 * 60 * 1000);

    ws.on("close", (code, reason) => {
      console.log(
        `Socket closed: ${code} ${reason.toString()}`
      );

      clearInterval(staleCheck);
      clearInterval(refreshConnection);

      console.log("Reconnecting in 3 seconds...");

      setTimeout(() => {
        connect();
      }, 3000);
    });
  };

  connect();
}
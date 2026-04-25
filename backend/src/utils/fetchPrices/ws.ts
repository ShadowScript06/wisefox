import WebSocket from "ws";
const dotenv = require("dotenv");
dotenv.config();

export const prices: any = {
  BTCUSD: null,
  PAXGUSD: null,
};

export function getPrices() {
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
    const payload = {
      type: "subscribe",
      payload: {
        channels: [
          {
            name: channel,
            symbols,
          },
        ],
      },
    };

    ws.send(JSON.stringify(payload));
    console.log("Subscribed:", channel, symbols);
  }

  ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());

    // INDIA DELTA v2/ticker = flat object
    if (msg.type === "v2/ticker" && msg.symbol) {
      const symbol = msg.symbol;

      prices[symbol] = {
        close: Number(msg.close),
        mark: Number(msg.mark_price),
        bid: Number(msg.quotes?.best_bid || 0),
        ask: Number(msg.quotes?.best_ask || 0),
        spot: Number(msg.spot_price || 0),
        funding: Number(msg.funding_rate || 0),
        volume: Number(msg.volume || 0),
        time: msg.time,
      };
      
    } else {
      console.log("RAW:", msg);
    }
  });

  ws.on("error", (err) => {
    console.error("Socket Error:", err);
  });

  ws.on("close", (code, reason) => {
    console.log("Socket closed:", code, reason.toString());
  });
}
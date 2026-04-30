import { updatePrices } from "../../redux/marketPriceSlice";
import { setPositions } from "../../redux/positionsSlice";
import type { AppDispatch } from "../../redux/store";

let socket: WebSocket | null = null;

export function openWS(dispatch: AppDispatch) {
  socket = new WebSocket("ws://localhost:5000");

  socket.onopen = () => {
    console.log("WS connected");
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "SNAPSHOT":
        case "TICK":
          dispatch(updatePrices(msg.data));
          break;

        case "PNL_UPDATE":
          dispatch(setPositions(msg.data));
          break;

        case "LIQUIDATED":{
          const date = new Date();
          console.log(date.toLocaleTimeString());
          console.log(msg);
          break;
        }

        case "MARGIN_CALL": {
          const date = new Date();
          console.log(date.toLocaleTimeString());
          console.log(msg);
          break;
        }
        default:
          console.log("Unknown WS msg:", msg.type);
      }
    } catch (error) {
      console.log("WS error:", error);
    }
  };

  socket.onerror = (err) => {
    console.log("WS error:", err);
  };

  socket.onclose = () => {
    console.log("WS closed");
  };
}

export function closeWS() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close(1000, "Client closed connection");
    socket = null;
    console.log("WS closing initiated");
  }
}

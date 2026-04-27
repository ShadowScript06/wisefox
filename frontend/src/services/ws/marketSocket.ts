
import { updatePrices } from "../../redux/marketSlice";
import type { AppDispatch } from "../../redux/store";

let socket:WebSocket|null = null;




export function openWS(dispatch:AppDispatch) {
    
  socket = new WebSocket("ws://localhost:5000");

  socket.onopen = () => {
    console.log("WS connected");
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      
      dispatch(updatePrices(msg.data));
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
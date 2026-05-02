import { createSlice,type PayloadAction } from "@reduxjs/toolkit";
import { nanoid } from "nanoid";

/**
 * Incoming WS message (what backend sends / what you dispatch)
 */
export type WSMessage = {
  type: "MARGIN_CALL" | "LIQUIDATED";
  message: string;
};

/**
 * Stored notification in Redux
 */
type Notification = {
  id: string;
  type: WSMessage["type"];
  message: string;
};

type State = {
  queue: Notification[];
};

const initialState: State = {
  queue: [],
};

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    /**
     * Add notification from WS
     */
    add: (state, action: PayloadAction<WSMessage>) => {
      state.queue.push({
        id: nanoid(),
        type: action.payload.type,
        message: action.payload.message,
      });
    },

    /**
     * Remove after toast is shown
     */
    remove: (state, action: PayloadAction<string>) => {
      state.queue = state.queue.filter(n => n.id !== action.payload);
    },

    /**
     * Optional: clear all (logout, reset, etc.)
     */
    clear: (state) => {
      state.queue = [];
    },
  },
});

export const { add, remove, clear } = notificationsSlice.actions;
export default notificationsSlice.reducer;
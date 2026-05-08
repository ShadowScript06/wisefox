import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { nanoid } from "nanoid";

type AlertEvent = {
  eventId: string; // local id for remove
  alertId: string; // ONLY backend alert id
};

type State = {
  queue: AlertEvent[];
};

const initialState: State = {
  queue: [],
};

const alertSlice = createSlice({
  name: "alerts",
  initialState,
  reducers: {
    addAlert: (state, action: PayloadAction<string>) => {
      state.queue.push({
        eventId: nanoid(),
        alertId: action.payload,
      });
    },

    removeAlert: (state, action: PayloadAction<string>) => {
      state.queue = state.queue.filter(
        a => a.eventId !== action.payload
      );
    },

    clearAlerts: (state) => {
      state.queue = [];
    },
  },
});

export const { addAlert, removeAlert, clearAlerts } = alertSlice.actions;
export default alertSlice.reducer;
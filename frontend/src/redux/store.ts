import { configureStore } from "@reduxjs/toolkit";

import marketReducer from "./marketPriceSlice";
import positionsReducer from "./positionsSlice";
import notificationsReducer from "./notificationSlice";
import alertReducer from "./alertSlice";


export const store = configureStore({
  reducer: {
    market: marketReducer,
    positions: positionsReducer,
    notifications: notificationsReducer,
    alerts: alertReducer,
  },
});

export type AppDispatch = typeof store.dispatch;

export type RootState = ReturnType<typeof store.getState>;

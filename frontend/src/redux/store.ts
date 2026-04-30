import { configureStore } from "@reduxjs/toolkit";

import marketReducer from "./marketPriceSlice";
import positionsReducer from "./positionsSlice";

export const store=configureStore({
    reducer:{
        market:marketReducer,
        positions:positionsReducer
    }
})

export type AppDispatch = typeof store.dispatch;

export type RootState = ReturnType<typeof store.getState>;
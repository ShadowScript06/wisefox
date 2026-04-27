import { configureStore } from "@reduxjs/toolkit";

import marketReducer from "./marketSlice";


export const store=configureStore({
    reducer:{
        market:marketReducer
    }
})

export type AppDispatch = typeof store.dispatch;

export type RootState = ReturnType<typeof store.getState>;
import { createSlice } from "@reduxjs/toolkit";

type State = {
  PAXGUSD: number;
  BTCUSD: number;
};

const initialState: State = {
  PAXGUSD: 0,
  BTCUSD: 0
};


export const marketSlice = createSlice({
  name: "market",
  initialState,
  reducers: {
    updatePrices: (state, action) => {
      const data = action.payload;

      // merge all incoming prices
      Object.assign(state, data);
    }
  },
});


export const { updatePrices } = marketSlice.actions;
export default marketSlice.reducer;

import { createSlice,type PayloadAction } from "@reduxjs/toolkit";

export interface PositionStateItem{
    positionId:string,
    symbol:string,
    direction:"LONG"|"SHORT",
    quantity:number,
    avgEntryPrice:number,
    currentPrice:number,
    unrealizedPnl:number
}

interface PositionsState{
    positions:PositionStateItem[];
    totalUnrealizedPnl:number
}

const initialState: PositionsState = {
  positions: [],
  totalUnrealizedPnl: 0,
};


const positionsSlice = createSlice({
  name: "positions",
  initialState,
  reducers: {
    setPositions(state, action: PayloadAction<PositionStateItem[]>) {
      state.positions = action.payload;

      state.totalUnrealizedPnl =
        action.payload.reduce(
          (sum, p) => sum + p.unrealizedPnl,
          0
        );
    },

    clearPositions(state) {
      state.positions = [];
      state.totalUnrealizedPnl = 0;
    },

  },
});

export const {
  setPositions,
  clearPositions,
} = positionsSlice.actions;

export default positionsSlice.reducer;
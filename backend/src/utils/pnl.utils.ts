import { Position } from "../generated/prisma/client";

export function calcUnrealizedPnl(
    position:Position,
    currentPrice:number
):number{
 if (position.direction === 'LONG') {
    return (currentPrice - position.avgEntryPrice) * position.quantity
  }
  return (position.avgEntryPrice - currentPrice) * position.quantity
}
import { Direction, Position } from "../generated/prisma/client";

export function calcUnrealizedPnl(
    position:Position,
    currentPrice:number
):number{
 if (position.direction === 'LONG') {
    return (currentPrice - position.avgEntryPrice) * position.quantity
  }
  return (position.avgEntryPrice - currentPrice) * position.quantity
}

export function calcPnlAndCharges(
  direction: Direction,
  entryPrice: number,
  exitPrice: number,
  contracts: number,
): { realizedPnl: number; charges: number } {
  const qty = contracts / 1000; // BTC qty

  const brokerage = entryPrice * 0.0005 * qty + exitPrice * 0.0005 * qty;

  const gst = brokerage * 0.18;

  const charges = brokerage + gst;

  const grossPnl =
    direction === "LONG"
      ? (exitPrice - entryPrice) * qty
      : (entryPrice - exitPrice) * qty;

  return { realizedPnl: grossPnl - charges, charges };
}
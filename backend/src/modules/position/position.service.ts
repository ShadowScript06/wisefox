import { Direction } from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";

interface TradeInput {
  id: string;
  accountId: string;
  symbol: string;
  direction: Direction;
  quantity: number;
  price: number;
  leverage:number;
  marginUsed:number
}

function calcAvgEntry(
  existingQty: number,
  existingAvg: number,
  newQty: number,
  newPrice: number,
): number {
  return (
    (existingQty * existingAvg + newQty * newPrice) / (existingQty + newQty)
  );
}

function calcPnl(
  direction: Direction,
  entryPrice: number,
  exitprice: number,
  quantity: number,
): number {
  if (direction === "LONG") return (exitprice - entryPrice) * quantity;

  return (entryPrice - exitprice) * quantity;
}

async function processTradeIntoPosition(trade: TradeInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existingPosition = await tx.position.findFirst({
      where: {
        accountId: trade.accountId,
        symbol: trade.symbol,
        isOpen: true,
      },
    });
    // ─── Scenario A: No open position → just open one ───────────────────
    if (!existingPosition) {
      await tx.position.create({
        data: {
          accountId: trade.accountId,
          symbol: trade.symbol,
          direction: trade.direction,
          quantity: trade.quantity,
          avgEntryPrice: trade.price,
           leverage: trade.leverage,
    marginUsed: trade.marginUsed,
        },
      });

      await tx.trade.update({
        where: {
          id: trade.id,
        },
        data: {
          realizedPnl: 0,
        },
      });

      return;
    }

    const isSameDirection = existingPosition.direction === trade.direction;

    // ─── Scenario B: Same side → accumulate ─────────────────────────────

    if (isSameDirection) {
      const newQty = existingPosition.quantity + trade.quantity;

      if (newQty > 100000) {
        throw new Error(
          `Position cap exceeded for ${trade.symbol}. Max qty is 100,000`,
        );
      }

      const newAvg = calcAvgEntry(
        existingPosition.quantity,
        existingPosition.avgEntryPrice,
        trade.quantity,
        trade.price,
      );

      await tx.position.update({
        where: { id: existingPosition.id },
        data: { quantity: newQty, avgEntryPrice: newAvg, marginUsed: { increment: trade.marginUsed }, },
      });

      await tx.trade.update({
        where: { id: trade.id },
        data: { realizedPnl: 0 },
      });

      return;
    }

     // ─── Scenario C: Opposite side → net / flip ──────────────────────────
    const closingQty = Math.min(existingPosition.quantity, trade.quantity)
    const remainingQty = trade.quantity - closingQty
    const closingRatio = closingQty / existingPosition.quantity
    const marginToRelease = existingPosition.marginUsed * closingRatio

    // PnL on the closed portion
    const realizedPnl = calcPnl(
      existingPosition.direction,
      existingPosition.avgEntryPrice,
      trade.price,
      closingQty
    )

    // update trade with its realized pnl
    await tx.trade.update({
      where: { id: trade.id },
      data: { realizedPnl },
    })

    // update account balance
    await tx.account.update({
      where: { id: trade.accountId },
      data: { balance: { increment: realizedPnl },marginUsed: { decrement: marginToRelease }, },
    })

    if (remainingQty === 0) {
      // exact close — position fully closed
      await tx.position.update({
        where: { id: existingPosition.id },
        data: {
          isOpen: false,
          quantity: 0,
          realizedPnl: { increment: realizedPnl },
        },
      })
    } else {
      // flip — close existing, open new in opposite direction
      await tx.position.update({
        where: { id: existingPosition.id },
        data: {
          isOpen: false,
            quantity: 0,
             marginUsed: 0,
          realizedPnl: { increment: realizedPnl },
        },
      })

      await tx.position.create({
        data: {
          accountId: trade.accountId,
          symbol: trade.symbol,
          direction: trade.direction,           // new direction
          quantity: remainingQty,
          avgEntryPrice: trade.price,
           leverage: trade.leverage,
    marginUsed: trade.marginUsed,
        },
      })
    }
  });
}


const getPositions =async(accountId:string)=>{
    const positions=await prisma.position.findMany({
        where:{
            accountId,isOpen:true
        },
        orderBy:{
            createdAt:'desc'
        }
    });

    return positions;
}

const getTradeHistory =async(accountId:string)=>{
    const trades=await prisma.trade.findMany({
        where:{accountId},
        orderBy:{
            createdAt:'desc'
        }
    })
}
const positionServices = {
  processTradeIntoPosition,
  getPositions,
  getTradeHistory
};

export default positionServices;

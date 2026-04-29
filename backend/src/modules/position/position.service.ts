import { Position } from "../../generated/prisma/client";
import { Direction } from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { getLivePrice } from "../../utils/fetchPrices/price.utils";
import { calcRequiredMargin } from "../../utils/margin.utils";
import { calcPnlAndCharges } from "../../utils/pnl.utils";


interface TradeInput {
  id: string;
  accountId: string;
  symbol: string;
  direction: Direction;
  quantity: number;
  price: number;
  leverage: number;
  marginUsed: number;
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


async function processTradeIntoPosition(
  trade: TradeInput,
  tx: any,
): Promise<void> {
  const existingPosition: Position = await tx.position.findFirst({
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
      data: {
        quantity: newQty,
        avgEntryPrice: newAvg,
        marginUsed: { increment: trade.marginUsed },
      },
    });

    await tx.trade.update({
      where: { id: trade.id },
      data: { realizedPnl: 0 },
    });

    return;
  }

  // ─── Scenario C: Opposite side → net / flip ──────────────────────────

  const remainingQty = existingPosition.quantity - trade.quantity;

  const marginToRelease =
    (existingPosition.marginUsed * trade.quantity) / existingPosition.quantity;

    

  // PnL on the closed portion
  const result = calcPnlAndCharges(
    existingPosition.direction,
    existingPosition.avgEntryPrice,
    trade.price,
    trade.quantity,
  );

  await tx.trade.update({
    where: { id: trade.id },
    data: { realizedPnl: result.realizedPnl, charges: result.charges },
  });

  // update account balance
  await tx.account.update({
    where: { id: trade.accountId },
    data: {
      balance: { increment: result.realizedPnl + marginToRelease },
      marginUsed: { decrement: marginToRelease },
      netPnl: {
        increment: result.realizedPnl,
      },
      charges: {
        increment: result.charges,
      },
    },
  });

  // Close Partial
  if (remainingQty > 0) {
    await tx.position.update({
      where: { id: existingPosition.id },
      data: {
        quantity: { decrement: trade.quantity },
        realizedPnl: { increment: result.realizedPnl },
        marginUsed:{
          decrement:marginToRelease
        }
      },
    });

    // close fully
  } else if (remainingQty === 0) {
    await tx.position.update({
      where: { id: existingPosition.id },
      data: {
        quantity: 0,
        realizedPnl: { increment: result.realizedPnl},
        isOpen: false,
        marginUsed:{
          decrement:marginToRelease
        }
      },
    });
  }

  // flip position i.e. close current postion and take position on opposite side with remaining qty
  else if (remainingQty < 0) {

     await tx.position.update({
      where: { id: existingPosition.id },
      data: {
        quantity: { decrement: 0 },
        realizedPnl: { increment: result.realizedPnl },
        isOpen: false,
        marginUsed:{
          decrement:marginToRelease
        }
      },
    });

    const currentQty = remainingQty * -1;

    const requiredMargin=calcRequiredMargin(currentQty,trade.price,trade.leverage);

    

    await tx.account.update({
        where: { id: trade.accountId },
        data: {
          marginUsed: { increment: requiredMargin },
          balance: { decrement: requiredMargin },
        },
      });

    await tx.position.create({
      data: {
        accountId: trade.accountId,
        symbol: trade.symbol,
        direction: trade.direction, // new direction
        quantity: currentQty,
        avgEntryPrice: trade.price,
        leverage: trade.leverage,
        marginUsed: trade.marginUsed,
      },
    });
  }

  return;

  // if (remainingQty === 0) {
  //   // exact close — position fully closed
  //   await tx.position.update({
  //     where: { id: existingPosition.id },
  //     data: {
  //       isOpen: false,
  //       quantity: 0,
  //       realizedPnl: { increment: realizedPnl },
  //     },
  //   });
  // } else {
  //   // flip — close existing, open new in opposite direction
  //   await tx.position.update({
  //     where: { id: existingPosition.id },
  //     data: {
  //       isOpen: false,
  //       quantity: 0,
  //       marginUsed: 0,
  //       realizedPnl: { increment: realizedPnl },
  //     },
  //   });

  //   await tx.position.create({
  //     data: {
  //       accountId: trade.accountId,
  //       symbol: trade.symbol,
  //       direction: trade.direction, // new direction
  //       quantity: remainingQty,
  //       avgEntryPrice: trade.price,
  //       leverage: trade.leverage,
  //       marginUsed: trade.marginUsed,
  //     },
  //   });
  // }
}

const getPositions = async (accountId: string) => {
  const positions = await prisma.position.findMany({
    where: {
      accountId,
      isOpen: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return positions;
};

const getTradeHistory = async (accountId: string) => {
  const trades = await prisma.trade.findMany({
    where: { accountId },
    orderBy: {
      createdAt: "desc",
    },
  });
};
const positionServices = {
  processTradeIntoPosition,
  getPositions,
  getTradeHistory,
};

export default positionServices;

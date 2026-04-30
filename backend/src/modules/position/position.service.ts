import { Position } from "../../generated/prisma/client";
import { Direction } from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { upsertAccount } from "../../utils/cache/accountCache";
import cachedPositions, { removePositionCache, upsertPositionCache } from "../../utils/cache/positionCache";
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
    const position = await tx.position.create({
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

    upsertPositionCache(trade.accountId,trade.symbol,position);


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

    const updatedPosition=await tx.position.update({
      where: { id: existingPosition.id },
      data: {
        quantity: newQty,
        avgEntryPrice: newAvg,
        marginUsed: { increment: trade.marginUsed },
      },
    });

    upsertPositionCache(trade.accountId,trade.symbol,updatedPosition);






    await tx.trade.update({
      where: { id: trade.id },
      data: { realizedPnl: 0 },
    });

    return;
  }

  // ─── Scenario C: Opposite side → net / flip ──────────────────────────

  const remainingQty = existingPosition.quantity - trade.quantity;
  // Close Partial
  if (remainingQty > 0) {
    const marginToRelease =
      (existingPosition.marginUsed * trade.quantity) /
      existingPosition.quantity;

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
    const updatedAccount=await tx.account.update({
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

    upsertAccount(updatedAccount);

    const updatedPosition=await tx.position.update({
      where: { id: existingPosition.id },
      data: {
        quantity: { decrement: trade.quantity },
        realizedPnl: { increment: result.realizedPnl },
        marginUsed: {
          decrement: marginToRelease,
        },
      },
    });

   upsertPositionCache(trade.accountId,trade.symbol,updatedPosition);


    // close fully
  } else if (remainingQty === 0) {
    const result = calcPnlAndCharges(
      existingPosition.direction,
      existingPosition.avgEntryPrice,
      trade.price,
      trade.quantity,
    );

    const fullMargin = existingPosition.marginUsed;

    await tx.trade.update({
      where: { id: trade.id },
      data: {
        realizedPnl: result.realizedPnl,
        charges: result.charges,
      },
    });

    const updatedAccount=await tx.account.update({
      where: { id: trade.accountId },
      data: {
        balance: {
          increment: result.realizedPnl + fullMargin,
        },
        marginUsed: {
          decrement: fullMargin,
        },
        netPnl: {
          increment: result.realizedPnl,
        },
        charges: {
          increment: result.charges,
        },
      },
    });

    upsertAccount(updatedAccount);

    await tx.position.update({
      where: { id: existingPosition.id },
      data: {
        quantity: 0,
        realizedPnl: { increment: result.realizedPnl },
        isOpen: false,
        marginUsed: 0,
      },
    });

    removePositionCache(trade.accountId,trade.symbol);

  }

  // flip position i.e. close current postion and take position on opposite side with remaining qty
  else if (remainingQty < 0) {
    const currentQty = Math.abs(remainingQty);

    const closeResult = calcPnlAndCharges(
      existingPosition.direction,
      existingPosition.avgEntryPrice,
      trade.price,
      existingPosition.quantity,
    );

    const oldMargin = existingPosition.marginUsed;

    const updatedAccount=await tx.account.update({
      where: { id: trade.accountId },
      data: {
        balance: {
          increment: closeResult.realizedPnl + oldMargin,
        },
        marginUsed: {
          decrement: oldMargin,
        },
        netPnl: {
          increment: closeResult.realizedPnl,
        },
        charges: {
          increment: closeResult.charges,
        },
      },
    });

    upsertAccount(updatedAccount);

    await tx.position.update({
      where: { id: existingPosition.id },
      data: {
        quantity: 0,
        isOpen: false,
        marginUsed: 0,
        realizedPnl: { increment: closeResult.realizedPnl },
      },
    });

    removePositionCache(trade.accountId,trade.symbol)

    // STEP 2: OPEN NEW POSITION
    const newMargin = calcRequiredMargin(
      currentQty,
      trade.price,
      trade.leverage,
    );

    const updatedAccount2=await tx.account.update({
      where: { id: trade.accountId },
      data: {
        balance: { decrement: newMargin },
        marginUsed: { increment: newMargin },
      },
    });

    upsertAccount(updatedAccount2);
    
    const newPosition=await tx.position.create({
      data: {
        accountId: trade.accountId,
        symbol: trade.symbol,
        direction: trade.direction,
        quantity: currentQty,
        avgEntryPrice: trade.price,
        leverage: trade.leverage,
        marginUsed: newMargin,
        isOpen: true,
      },
    });

     upsertPositionCache(trade.accountId,trade.symbol,newPosition);

  }
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

  return trades;
};
const positionServices = {
  processTradeIntoPosition,
  getPositions,
  getTradeHistory,
};

export default positionServices;

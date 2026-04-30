
import { prisma } from "../../lib/prisma";
import { getAccountPositions } from "../../utils/cache/positionCache";
import { getLivePrice } from "../../utils/fetchPrices/price.utils";
import { calcUnrealizedPnl } from "../../utils/pnl.utils";

async function getUnrealisedPnlForAccount(accountId: string) {
  const positions =getAccountPositions(accountId);
  

  if (positions.length === 0) return [];

  return positions.map((position) => {
    const currentPrice = getLivePrice(position.symbol);

    const unrealizedPnl = calcUnrealizedPnl(position, currentPrice);

    return {
      positionId: position.id,
      symbol: position.symbol,
      direction: position.direction,
      quantity: position.quantity,
      avgEntryPrice: position.avgEntryPrice,
      currentPrice,
      unrealizedPnl: Number(unrealizedPnl.toFixed(2)),
    };
  });
}


const pnlServices={
    getUnrealisedPnlForAccount
}

export default pnlServices;
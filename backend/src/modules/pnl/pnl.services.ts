
import { prisma } from "../../lib/prisma";
import { getLivePrice } from "../../utils/fetchPrices/price.utils";
import { calcUnrealizedPnl } from "../../utils/pnl.utils";

async function getUnrealisedPnlForAccount(accountId: string) {
  const positions = await prisma.position.findMany({
    where: { accountId, isOpen: true },
  });

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
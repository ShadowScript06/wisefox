import auditServices from "../audit/audit.services";
import { calcMarginLevel } from "../../utils/margin.utils";
import { getLivePrice } from "../../utils/fetchPrices/price.utils";
import { prisma } from "../../lib/prisma";
import {
  getAccountPositions,
  removePositionCache,
} from "../../utils/cache/positionCache";
import {
  getAccountById,
  getAllAccounts,
  upsertAccount,
} from "../../utils/cache/accountCache";
import { calcPnlAndCharges, calcUnrealizedPnl } from "../../utils/pnl.utils";
auditServices;

const MARGIN_CALL_THRESHOLD = 100; // warn below 100%
const LIQUIDATION_THRESHOLD = 50; // liquidate below 50%

async function checkAndLiquidate(accountId: string): Promise<{
  marginCall: boolean;
  liquidated: boolean;
}> {
  const account = getAccountById(accountId);

  if (!account || account.marginUsed === 0) {
    return { marginCall: false, liquidated: false };
  }

  const positions = getAccountPositions(accountId);

  let equity = account.balance;

  for (const position of positions) {
    const currentPrice = getLivePrice(position.symbol);

    const unrealisedPnl = calcUnrealizedPnl(position, currentPrice);

    equity += unrealisedPnl;
  }

  const marginLevel = calcMarginLevel(equity, account.marginUsed);

  // margin call warning
  if (
    marginLevel < MARGIN_CALL_THRESHOLD &&
    marginLevel >= LIQUIDATION_THRESHOLD
  ) {
    await auditServices.log(
      accountId,
      "MARGIN_CALL",
      `Margin level at ${marginLevel.toFixed(2)}%`,
      {
        marginLevel,
        balance: account.balance,
        marginUsed: account.marginUsed,
      },
    );
    return { marginCall: true, liquidated: false };
  }

  // liquidation
  if (marginLevel < LIQUIDATION_THRESHOLD) {
    await liquidateAccount(accountId);
    return { marginCall: false, liquidated: true };
  }

  return { marginCall: false, liquidated: false };
}

async function liquidateAccount(accountId: string): Promise<void> {
  try {
   

    const positions = getAccountPositions(accountId);

    await prisma.$transaction(async (tx) => {
      // lock account
      const account = await tx.$queryRaw<{ id: string; balance: number }[]>`
      SELECT id, balance FROM "Account"
      WHERE id = ${accountId}
      FOR UPDATE
    `;

      if (!account[0]) throw new Error("Account not found during liquidation");

      let totalRealizedPnl = 0;
      let totalMarginReleased = 0;
      let totalCharges=0
      for (const position of positions) {
        const currentPrice = getLivePrice(position.symbol);


        const { realizedPnl ,charges} = calcPnlAndCharges(
          position.direction,
          position.avgEntryPrice,
          currentPrice,
          position.quantity,
        );
        console.log(realizedPnl);

        totalRealizedPnl += realizedPnl;
        totalMarginReleased += position.marginUsed;
        totalCharges+=charges;
        
        const closedPosition = await tx.position.update({
          where: { id: position.id },
          data: {
            isOpen: false,
            quantity: 0,
            marginUsed: 0,
            realizedPnl: { increment: realizedPnl },
            closedAt:new Date()
            
          },
        });

        removePositionCache(accountId, closedPosition.symbol);

        // log each position closure
        await tx.auditLog.create({
          data: {
            accountId,
            type: "LIQUIDATION",
            message: `Position ${position.symbol} liquidated at ${currentPrice}`,
            meta: {
              symbol: position.symbol,
              direction: position.direction,
              qty: position.quantity,
              avgEntryPrice: position.avgEntryPrice,
              closePrice: currentPrice,
              realizedPnl,
            },
          },
        });
      }

      // update account — realize all P&L + release all margin
      const updatedAccount = await tx.account.update({
        where: { id: accountId },
        data: {
          balance: { increment: totalRealizedPnl+ totalMarginReleased },
          marginUsed: 0,
          netPnl:{increment:totalRealizedPnl},
          charges:{increment:totalCharges}
        },
      });

      upsertAccount(updatedAccount);
    });

    await auditServices.log(
      accountId,
      "LIQUIDATION",
      `Account liquidated. All positions closed.`,
      {
        positionCount: positions.length,
      },
    );
  } catch (error) {
    console.log(error);
  }
}

const liquidationService = {
  checkAndLiquidate,
};

export default liquidationService;

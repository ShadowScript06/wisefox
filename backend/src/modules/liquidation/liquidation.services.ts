
import auditServices from '../audit/audit.services'
import { calcMarginLevel } from '../../utils/margin.utils'
import { getLivePrice } from '../../utils/fetchPrices/price.utils'
import { prisma } from '../../lib/prisma'
auditServices



const MARGIN_CALL_THRESHOLD = 100   // warn below 100%
const LIQUIDATION_THRESHOLD = 50    // liquidate below 50%

 async function checkAndLiquidate(accountId: string): Promise<{
  marginCall: boolean
  liquidated: boolean
}> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  })

  if (!account || account.marginUsed === 0) {
    return { marginCall: false, liquidated: false }
  }

  const marginLevel = calcMarginLevel(account.balance, account.marginUsed)

  // margin call warning
  if (marginLevel < MARGIN_CALL_THRESHOLD && marginLevel >= LIQUIDATION_THRESHOLD) {
    await auditServices.log(accountId, 'MARGIN_CALL', `Margin level at ${marginLevel.toFixed(2)}%`, {
      marginLevel,
      balance: account.balance,
      marginUsed: account.marginUsed,
    })
    return { marginCall: true, liquidated: false }
  }

  // liquidation
  if (marginLevel < LIQUIDATION_THRESHOLD) {
    await liquidateAccount(accountId)
    return { marginCall: false, liquidated: true }
  }

  return { marginCall: false, liquidated: false }
}

async function liquidateAccount(accountId: string): Promise<void> {
  const positions = await prisma.position.findMany({
    where: { accountId, isOpen: true },
  })

  if (positions.length === 0) return

  await prisma.$transaction(async (tx) => {
    // lock account
    const account = await tx.$queryRaw<{ id: string; balance: number }[]>`
      SELECT id, balance FROM "Account"
      WHERE id = ${accountId}
      FOR UPDATE
    `

    if (!account[0]) throw new Error('Account not found during liquidation')

    let totalRealizedPnl = 0
    let totalMarginReleased = 0

    for (const position of positions) {
      const currentPrice = getLivePrice(position.symbol)

      // calc P&L on forced close
      const realizedPnl =
        position.direction === 'LONG'
          ? (currentPrice - position.avgEntryPrice) * position.quantity
          : (position.avgEntryPrice - currentPrice) * position.quantity

      totalRealizedPnl += realizedPnl
      totalMarginReleased += position.marginUsed

      // close position
      await tx.position.update({
        where: { id: position.id },
        data: {
          isOpen: false,
          qty: 0,
          marginUsed: 0,
          realizedPnl: { increment: realizedPnl },
        },
      })

      // log each position closure
      await tx.auditLog.create({
        data: {
          accountId,
          type: 'LIQUIDATION',
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
      })
    }

    // update account — realize all P&L + release all margin
    await tx.account.update({
      where: { id: accountId },
      data: {
        balance: { increment: totalRealizedPnl },
        marginUsed: 0,
      },
    })
  })

  await auditServices.log(accountId, 'LIQUIDATION', `Account liquidated. All positions closed.`, {
    positionCount: positions.length,
  })
}

const liquidationService={
    checkAndLiquidate
}

export default liquidationService;


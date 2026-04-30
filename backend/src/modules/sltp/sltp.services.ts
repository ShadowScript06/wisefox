import { prisma } from "../../lib/prisma"
import { Position } from "../../generated/prisma/client"
import auditServices from "../audit/audit.services"
import { getLivePrice } from "../../utils/fetchPrices/price.utils"
import { upsertAccount } from "../../utils/cache/accountCache"
import { upsertPositionCache } from "../../utils/cache/positionCache"


interface SetSLTPInput {
  positionId: string
  accountId: string
  slPrice?: number
  slQty?: number
  tpPrice?: number
  tpQty?: number
}

async function setSLTP(input: SetSLTPInput): Promise<void> {
  const { positionId, accountId, slPrice, slQty, tpPrice, tpQty } = input

  const position = await prisma.position.findFirst({
    where: { id: positionId, accountId, isOpen: true },
  })

  if (!position) throw new Error('Open position not found')

  // validate qty
  if (slQty !== undefined && (slQty <= 0 || slQty > position.quantity)) {
    throw new Error(`SL qty must be between 1 and ${position.quantity}`)
  }
  if (tpQty !== undefined && (tpQty <= 0 || tpQty > position.quantity)) {
    throw new Error(`TP qty must be between 1 and ${position.quantity}`)
  }

  // validate prices make sense
  if (slPrice !== undefined && tpPrice !== undefined) {
    if (position.direction === 'LONG' && slPrice >= tpPrice) {
      throw new Error('For LONG: SL must be below TP')
    }
    if (position.direction === 'SHORT' && slPrice <= tpPrice) {
      throw new Error('For SHORT: SL must be above TP')
    }
  }

  await prisma.position.update({
    where: { id: positionId },
    data: {
      slPrice: slPrice ?? null,
      slQty: slQty ?? null,
      tpPrice: tpPrice ?? null,
      tpQty: tpQty ?? null,
      slHit: false,
      tpHit: false,
    },
  })
}

function shouldTriggerSL(position: Position, currentPrice: number): boolean {
  if (!position.slPrice || position.slHit) return false
  if (position.direction === 'LONG') return currentPrice <= position.slPrice
  return currentPrice >= position.slPrice
}

function shouldTriggerTP(position: Position, currentPrice: number): boolean {
  if (!position.tpPrice || position.tpHit) return false
  if (position.direction === 'SHORT') return currentPrice >= position.tpPrice
  return currentPrice <= position.tpPrice
}

async function partialClose(
  position: Position,
  closeQty: number,
  closePrice: number,
  reason: 'SL' | 'TP',
  tx: any
): Promise<void> {
  const isFullClose = closeQty >= position.quantity

  const realizedPnl =
    position.direction === 'LONG'
      ? (closePrice - position.avgEntryPrice) * closeQty
      : (position.avgEntryPrice - closePrice) * closeQty

  // margin to release proportionally
  const marginToRelease = (closeQty / position.quantity) * position.marginUsed

  if (isFullClose) {
    // full close
    await tx.position.update({
      where: { id: position.id },
      data: {
        isOpen: false,
        quantity: 0,
        marginUsed: 0,
        realizedPnl: { increment: realizedPnl },
        slHit: reason === 'SL' ? true : position.slHit,
        tpHit: reason === 'TP' ? true : position.tpHit,
      },
    })
  } else {
    // partial close — reduce qty, keep position open
    await tx.position.update({
      where: { id: position.id },
      data: {
        quantity: { decrement: closeQty },
        marginUsed: { decrement: marginToRelease },
        realizedPnl: { increment: realizedPnl },
        slHit: reason === 'SL' ? true : position.slHit,
        tpHit: reason === 'TP' ? true : position.tpHit,
      },
    })

    
  }

  // update account balance + release margin
  const  updatedAccount=await tx.account.update({
    where: { id: position.accountId },
    data: {
      balance: { increment: realizedPnl },
      marginUsed: { decrement: marginToRelease },
    },
  })
  upsertAccount(updatedAccount);

  // create trade record for this close
  await tx.trade.create({
    data: {
      orderId: null,        // no order — triggered by SL/TP
      accountId: position.accountId,
      symbol: position.symbol,
      direction: position.direction === 'LONG' ? 'SHORT' : 'LONG', // closing direction
      quantity: closeQty,
      price: closePrice,
      realizedPnl,
      trigger: reason,      // we'll add this field to Trade
    },
  })

  // audit log
  await tx.auditLog.create({
    data: {
      accountId: position.accountId,
      type: reason === 'SL' ? 'POSITION_CLOSED' : 'POSITION_CLOSED',
      message: `${reason} triggered on ${position.symbol} — closed ${closeQty} @ ${closePrice}`,
      meta: {
        reason,
        symbol: position.symbol,
        closeQty,
        closePrice,
        realizedPnl,
        isFullClose,
      },
    },
  })
}

 async function checkSLTPForAllPositions(): Promise<void> {
  const positions = await prisma.position.findMany({
    where: {
      isOpen: true,
      OR: [
        { slPrice: { not: null } },
        { tpPrice: { not: null } },
      ],
    },
  })

  for (const position of positions) {
    const currentPrice = getLivePrice(position.symbol)

    const triggerSL = shouldTriggerSL(position, currentPrice)
    const triggerTP = shouldTriggerTP(position, currentPrice)

    if (!triggerSL && !triggerTP) continue

    await prisma.$transaction(async (tx) => {
      // re-fetch with lock
      const locked = await tx.$queryRaw<Position[]>`
        SELECT * FROM "Position"
        WHERE id = ${position.id}
        FOR UPDATE
      `
      if (!locked[0] || !locked[0].isOpen) return

      if (triggerTP) {
        const closeQty = position.tpQty ?? position.quantity // partial or full
        await partialClose(locked[0], closeQty, currentPrice, 'TP', tx)
        console.log(`TP hit: ${position.symbol} closed ${closeQty} @ ${currentPrice}`)
      } else if (triggerSL) {
        const closeQty = position.slQty ?? position.quantity // partial or full
        await partialClose(locked[0], closeQty, currentPrice, 'SL', tx)
        console.log(`SL hit: ${position.symbol} closed ${closeQty} @ ${currentPrice}`)
      }
    }).catch((err) => {
      console.error(`SLTP check failed for position ${position.id}:`, err.message)
    })
  }
}

const sltpService={
    checkSLTPForAllPositions,
    setSLTP
}

export default sltpService;
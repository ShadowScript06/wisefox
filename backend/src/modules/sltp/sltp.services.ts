import { prisma } from "../../lib/prisma"
import { Position } from "../../generated/prisma/client"
import { getLivePrice } from "../../utils/fetchPrices/price.utils"
import { upsertAccount } from "../../utils/cache/accountCache"
import { upsertPositionCache, removePositionCache } from "../../utils/cache/positionCache"
import cachedPositions from "../../utils/cache/positionCache"
import { calcPnlAndCharges } from "../../utils/pnl.utils"

interface SetSLTPInput {
  positionId: string
  accountId: string
  slPrice?: number
  tpPrice?: number
}

async function setSLTP(input: SetSLTPInput): Promise<void> {
  const { positionId, accountId, slPrice, tpPrice } = input

  const position = await prisma.position.findFirst({
    where: { id: positionId, accountId, isOpen: true },
  })

  if (!position) throw new Error('Open position not found')

  // validate prices make sense
  if (slPrice !== undefined && tpPrice !== undefined) {
    if (position.direction === 'LONG' && slPrice >= tpPrice) {
      throw new Error('For LONG: SL must be below TP')
    }
    if (position.direction === 'SHORT' && slPrice <= tpPrice) {
      throw new Error('For SHORT: SL must be above TP')
    }
  }

  const updated = await prisma.position.update({
    where: { id: positionId },
    data: {
      slPrice: slPrice ?? null,
      tpPrice: tpPrice ?? null,
      slHit: false,
      tpHit: false,
    },
  })

  // Sync updated SL/TP into position cache
  upsertPositionCache(accountId, updated.symbol, updated)
}


// ── trigger helpers ──────────────────────────────────────────────────────────

function shouldTriggerSL(position: Position, currentPrice: number): boolean {
  if (!position.slPrice || position.slHit) return false
  if (position.direction === 'LONG') return currentPrice <= position.slPrice
  return currentPrice >= position.slPrice
}

function shouldTriggerTP(position: Position, currentPrice: number): boolean {
  if (!position.tpPrice || position.tpHit) return false
  if (position.direction === 'LONG') return currentPrice >= position.tpPrice
  return currentPrice <= position.tpPrice
}


// ── full close with OCO ──────────────────────────────────────────────────────

async function fullClose(
  position: Position,
  closePrice: number,
  reason: 'SL' | 'TP',
  tx: any
): Promise<void> {
  const { quantity, avgEntryPrice, marginUsed, accountId, symbol, direction } = position

  const currenPrice=getLivePrice(position.symbol);
  const {realizedPnl, charges} =calcPnlAndCharges(position.direction,position.avgEntryPrice,currenPrice,position.quantity);
  const marginToRelease=position.marginUsed;
  // Close position — null both SL/TP (OCO cancel)
  await tx.position.update({
    where: { id: position.id },
    data: {
      isOpen: false,
      quantity: 0,
      marginUsed: 0,
      realizedPnl: { increment: realizedPnl },
      slPrice: null,
      slHit: reason === 'SL',
      tpPrice: null,
      tpHit: reason === 'TP',
       closedAt:new Date()
    },
  })

  // Release margin and credit PnL to account
  const updatedAccount = await tx.account.update({
    where: { id: accountId },
    data: {
      balance: { increment: realizedPnl +marginToRelease },
      marginUsed: { decrement: marginUsed },
      netPnl:{increment:realizedPnl},
      charges:{increment:charges}
    },
  })

  // Trade record
  await tx.trade.create({
    data: {
      orderId: null,
      accountId,
      symbol,
      direction: direction === 'LONG' ? 'SHORT' : 'LONG',
      quantity,
      price: closePrice,
      realizedPnl,
      trigger: reason,
    },
  })

  // Audit log
  await tx.auditLog.create({
    data: {
      accountId,
      type: 'POSITION_CLOSED',
      message: `${reason} triggered on ${symbol} — fully closed ${quantity} @ ${closePrice}`,
      meta: {
        reason,
        symbol,
        closeQty: quantity,
        closePrice,
        realizedPnl,
        cancelledOrder: reason === 'SL' ? 'TP' : 'SL',
      },
    },
  })

  // ── cache updates (after tx commits these are consistent) ──
  // Position is closed → remove from active positions cache
  removePositionCache(accountId, symbol)

  // Account balance/margin changed → update account cache
  upsertAccount(updatedAccount)
}


// ── main checker loop (reads from cache, zero DB scans) ─────────────────────

async function checkSLTPForAllPositions(): Promise<void> {
  // Iterate over every account's positions straight from cache
  for (const [accountId, symbolMap] of cachedPositions) {
    for (const [symbol, position] of symbolMap) {


    
      // Skip positions with no SL or TP set
      if (!position.slPrice && !position.tpPrice) continue

      const currentPrice = getLivePrice(symbol)

      const triggerSL = shouldTriggerSL(position, currentPrice)
      const triggerTP = shouldTriggerTP(position, currentPrice)
      console.log("triggerSl:",triggerSL);
      console.log("triggertarget: ",triggerTP);

      if (!triggerSL && !triggerTP) continue

      await prisma.$transaction(async (tx) => {
        // Re-fetch with row-level lock to guard against race conditions
        const locked = await tx.$queryRaw<Position[]>`
          SELECT * FROM "Position"
          WHERE id = ${position.id}
          FOR UPDATE
        `
        if (!locked[0] || !locked[0].isOpen) {
          // Position already closed by another process — clean up stale cache entry
          removePositionCache(accountId, symbol)
          return
        }

        // TP takes priority if both trigger simultaneously
        if (triggerTP) {
          await fullClose(locked[0], currentPrice, 'TP', tx)
          console.log(`TP hit: ${symbol} fully closed ${position.quantity} @ ${currentPrice} — SL cancelled`)
        } else if (triggerSL) {
          await fullClose(locked[0], currentPrice, 'SL', tx)
          console.log(`SL hit: ${symbol} fully closed ${position.quantity} @ ${currentPrice} — TP cancelled`)
        }
      }).catch((err) => {
        console.error(`SLTP check failed for position ${position.id}:`, err.message)
      })
    }
  }
}

const sltpService = {
  checkSLTPForAllPositions,
  setSLTP,
}

export default sltpService
import { Position } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

const cachedPositions = new Map<string, Map<string, Position>>();

/**
 * Add new position OR update existing position
 * accountId -> symbol -> position
 */
export function upsertPositionCache(
  accountId: string,
  symbol: string,
  position: Position
): void {
  if (!cachedPositions.has(accountId)) {
    cachedPositions.set(accountId, new Map());
  }

  cachedPositions.get(accountId)!.set(symbol, position);
}

/**
 * Remove closed position from cache
 */
export function removePositionCache(
  accountId: string,
  symbol: string
): void {
  const accountPositions = cachedPositions.get(accountId);

  if (!accountPositions) return;

  accountPositions.delete(symbol);

  // optional cleanup if no symbols left
  if (accountPositions.size === 0) {
    cachedPositions.delete(accountId);
  }
}

/**
 * Get one symbol position for an account
 */
export function getPositionCache(
  accountId: string,
  symbol: string
): Position | undefined {
  return cachedPositions.get(accountId)?.get(symbol);
}

/**
 * Get all open positions for an account
 */
export function getAccountPositions(
  accountId: string
): Position[] {
  const accountPositions = cachedPositions.get(accountId);

  if (!accountPositions) return [];

  return Array.from(accountPositions.values());
}

/**
 * Export raw cache if ever needed
 */

export async function refreshPositionsCache() {
  const positions = await prisma.position.findMany({
    where: { isOpen: true },
  });

  const nextCache = new Map<
    string,
    Map<string, Position>
  >();

  for (const position of positions) {
    if (!nextCache.has(position.accountId)) {
      nextCache.set(position.accountId, new Map());
    }

    nextCache
      .get(position.accountId)!
      .set(position.symbol, position);
  }

  cachedPositions.clear();

  for (const [accountId, symbolMap] of nextCache) {
    cachedPositions.set(accountId, symbolMap);
  }

  console.log(
    `Positions cache refreshed: ${positions.length} open positions`
  );
}
export default cachedPositions;
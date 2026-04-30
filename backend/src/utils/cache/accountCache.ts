import { Account } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

/**
 * In-memory cache (O(1) access)
 */
let cachedAccounts = new Map<string, Account>();

/**
 * Get account by ID (O(1))
 */
export function getAccountById(accountId: string): Account | null {
  return cachedAccounts.get(accountId) ?? null;
}

/**
 * Remove account from cache
 */
export function removeAccount(accountId: string) {
  cachedAccounts.delete(accountId);
}

/**
 * Add or update single account (useful for live updates)
 */
export function upsertAccount(account: Account) {
  cachedAccounts.set(account.id, account);
}

/**
 * Full cache refresh from DB
 * (use sparingly — startup or periodic sync)
 */
export async function refreshAccountsCache() {
  console.log("Syncing Accounts from DB...");

  const accounts = await prisma.account.findMany();

  cachedAccounts.clear();

  for (const account of accounts) {
    cachedAccounts.set(account.id, account);
  }

  console.log(`Accounts cache refreshed: ${accounts.length}`);
}

/**
 * Optional: get all cached accounts
 */
export function getAllAccounts(): Account[] {
  return Array.from(cachedAccounts.values());
}

export default cachedAccounts;
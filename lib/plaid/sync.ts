import type { AccountBase, Transaction, RemovedTransaction } from "plaid";
import prisma from "@/lib/prisma";
import { getPlaidClient } from "@/lib/plaid/client";
import { decrypt } from "@/lib/plaid/encrypt";

export interface SyncResult {
  added: number;
  modified: number;
  removed: number;
}

/**
 * Runs a full cursor-based transactions/sync for a PlaidItem and persists the results.
 * Safe to call multiple times (all writes are idempotent upserts).
 */
export async function syncTransactionsForItem(plaidItemId: string): Promise<SyncResult> {
  const item = await prisma.plaidItem.findUnique({ where: { id: plaidItemId } });
  if (!item) throw new Error(`PlaidItem not found: ${plaidItemId}`);

  const accessToken = decrypt(item.accessTokenEncrypted);
  const plaid = getPlaidClient();

  // Cursor from last successful sync; undefined means start from the beginning.
  let cursor: string | undefined = item.cursor ?? undefined;

  const added: Transaction[] = [];
  const modified: Transaction[] = [];
  const removed: RemovedTransaction[] = [];
  // Deduplicate accounts across pages; last write wins (most recent balances).
  const accountMap = new Map<string, AccountBase>();

  let hasMore = true;

  while (hasMore) {
    const { data } = await plaid.transactionsSync({
      access_token: accessToken,
      cursor,
      count: 500,
      options: { include_personal_finance_category: true },
    });

    for (const account of data.accounts) {
      accountMap.set(account.account_id, account);
    }

    added.push(...data.added);
    modified.push(...data.modified);
    removed.push(...data.removed);

    hasMore = data.has_more;
    cursor = data.next_cursor;
  }

  // Upsert accounts before transactions (FK constraint).
  await Promise.all(
    [...accountMap.values()].map((account) =>
      prisma.plaidAccount.upsert({
        where: { plaidAccountId: account.account_id },
        create: {
          plaidAccountId: account.account_id,
          plaidItemId: item.id,
          name: account.name,
          officialName: account.official_name ?? null,
          mask: account.mask ?? null,
          type: account.type,
          subtype: account.subtype ?? null,
          currentBalance: account.balances.current ?? null,
          availableBalance: account.balances.available ?? null,
          currencyCode: account.balances.iso_currency_code ?? null,
        },
        update: {
          name: account.name,
          officialName: account.official_name ?? null,
          mask: account.mask ?? null,
          currentBalance: account.balances.current ?? null,
          availableBalance: account.balances.available ?? null,
          currencyCode: account.balances.iso_currency_code ?? null,
        },
      })
    )
  );

  // Upsert added + modified (same shape).
  const toUpsert = [...added, ...modified];
  await Promise.all(
    toUpsert.map((tx) =>
      prisma.plaidTransaction.upsert({
        where: { plaidTransactionId: tx.transaction_id },
        create: buildTransactionCreate(tx, item.id),
        update: buildTransactionUpdate(tx),
      })
    )
  );

  // Propagate modifications to already-imported Transaction records.
  if (modified.length > 0) {
    const modifiedPlaidTxIds = modified.map((tx) => tx.transaction_id);
    const importedModified = await prisma.plaidTransaction.findMany({
      where: {
        plaidTransactionId: { in: modifiedPlaidTxIds },
        importedTransactionId: { not: null },
      },
      select: { plaidTransactionId: true, importedTransactionId: true },
    });

    if (importedModified.length > 0) {
      const modifiedByPlaidId = new Map(modified.map((tx) => [tx.transaction_id, tx]));
      await Promise.all(
        importedModified.map((pt) => {
          const plaidTx = modifiedByPlaidId.get(pt.plaidTransactionId)!;
          return prisma.transaction.update({
            where: { id: pt.importedTransactionId! },
            data: {
              merchant: plaidTx.merchant_name ?? plaidTx.name,
              amount: Math.round(Math.abs(plaidTx.amount) * 100),
              date: new Date(plaidTx.date),
            },
          });
        })
      );
    }
  }

  // Delete transactions Plaid has removed.
  if (removed.length > 0) {
    const removedPlaidTxIds = removed.map((r) => r.transaction_id);

    // Delete linked Transaction records for any imported removals.
    const importedRemoved = await prisma.plaidTransaction.findMany({
      where: {
        plaidTransactionId: { in: removedPlaidTxIds },
        importedTransactionId: { not: null },
      },
      select: { importedTransactionId: true },
    });
    if (importedRemoved.length > 0) {
      await prisma.transaction.deleteMany({
        where: {
          id: { in: importedRemoved.map((r) => r.importedTransactionId!) },
        },
      });
    }

    await prisma.plaidTransaction.deleteMany({
      where: {
        plaidTransactionId: { in: removedPlaidTxIds },
      },
    });
  }

  // Persist the new cursor so the next sync is incremental.
  await prisma.plaidItem.update({
    where: { id: item.id },
    data: { cursor },
  });

  return { added: added.length, modified: modified.length, removed: removed.length };
}

function buildTransactionCreate(tx: Transaction, plaidItemId: string) {
  return {
    plaidTransactionId: tx.transaction_id,
    plaidItemId,
    plaidAccountId: tx.account_id,
    name: tx.name,
    merchantName: tx.merchant_name ?? null,
    amount: tx.amount,
    isoCurrencyCode: tx.iso_currency_code ?? null,
    date: new Date(tx.date),
    authorizedDate: tx.authorized_date ? new Date(tx.authorized_date) : null,
    pending: tx.pending,
    categoryPrimary: tx.personal_finance_category?.primary ?? null,
    categoryDetailed: tx.personal_finance_category?.detailed ?? null,
    rawJson: JSON.parse(JSON.stringify(tx)),
  };
}

function buildTransactionUpdate(tx: Transaction) {
  return {
    name: tx.name,
    merchantName: tx.merchant_name ?? null,
    amount: tx.amount,
    isoCurrencyCode: tx.iso_currency_code ?? null,
    date: new Date(tx.date),
    authorizedDate: tx.authorized_date ? new Date(tx.authorized_date) : null,
    pending: tx.pending,
    categoryPrimary: tx.personal_finance_category?.primary ?? null,
    categoryDetailed: tx.personal_finance_category?.detailed ?? null,
    rawJson: JSON.parse(JSON.stringify(tx)),
  };
}

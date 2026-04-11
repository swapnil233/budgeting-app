// Compute monthly occurrences of recurring expenses and match them against
// real transactions. Kept pure so it can run on the server or client.

import prisma from "@/lib/prisma";

export type RecurringFrequency = "MONTHLY" | "WEEKLY" | "BI_WEEKLY" | "YEARLY";

export interface RecurringInput {
  id: string;
  name: string;
  amount: number; // cents
  frequency: RecurringFrequency;
  dayOfMonth: number | null;
  startDate: Date | string;
  endDate: Date | string | null;
  active: boolean;
  categoryId: string;
  bankAccountId: string | null;
  notes: string | null;
}

export interface TransactionInput {
  id: string;
  date: Date | string;
  amount: number;
  type: "EXPENSE" | "INCOME";
  categoryId: string;
  merchant: string;
}

export interface RecurringOccurrence {
  recurring: RecurringInput;
  dueDate: Date;            // first/primary due date in the month
  dueDates: Date[];         // every occurrence in the month
  expectedAmount: number;   // total cents expected in the month
  matchedTransaction: TransactionInput | null;
  paidAmount: number;       // cents actually paid (sum of matched txns)
  isPaid: boolean;
  paymentsRemaining: number | null; // null when no endDate
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function clampDay(day: number, year: number, month: number): number {
  return Math.min(day, daysInMonth(year, month));
}

function monthStart(year: number, month: number): Date {
  return new Date(year, month - 1, 1);
}

function monthEnd(year: number, month: number): Date {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Occurrence generation ────────────────────────────────────────────────────

function occurrencesInMonth(
  recurring: RecurringInput,
  year: number,
  month: number,
): Date[] {
  const start = toDate(recurring.startDate);
  const end = recurring.endDate ? toDate(recurring.endDate) : null;
  const mStart = monthStart(year, month);
  const mEnd = monthEnd(year, month);

  // Globally inactive or not-yet-started or already-ended
  if (!recurring.active) return [];
  if (start > mEnd) return [];
  if (end && end < mStart) return [];

  const results: Date[] = [];

  switch (recurring.frequency) {
    case "MONTHLY": {
      // dayOfMonth === 0 is a sentinel meaning "last day of the month", which
      // varies (28/29/30/31) — resolve it against the target month length.
      const requested = recurring.dayOfMonth ?? start.getDate();
      const day =
        requested === 0 ? daysInMonth(year, month) : clampDay(requested, year, month);
      const date = new Date(year, month - 1, day);
      if (date >= mStart && date <= mEnd && date >= start && (!end || date <= end)) {
        results.push(date);
      }
      break;
    }
    case "YEARLY": {
      // Only fires in the same calendar month as the start date
      if (start.getMonth() !== month - 1) break;
      const day = clampDay(start.getDate(), year, month);
      const date = new Date(year, month - 1, day);
      if (date >= start && (!end || date <= end)) results.push(date);
      break;
    }
    case "WEEKLY":
    case "BI_WEEKLY": {
      const step = recurring.frequency === "WEEKLY" ? 7 : 14;
      // Find the first occurrence at or after max(start, mStart)
      const firstAnchor = start > mStart ? start : mStart;
      const daysFromStart = Math.max(0, diffDays(firstAnchor, start));
      const delta = daysFromStart % step;
      const offset = delta === 0 ? 0 : step - delta;
      const cursor = new Date(start);
      cursor.setDate(start.getDate() + daysFromStart + offset);
      while (cursor <= mEnd) {
        if (cursor >= start && (!end || cursor <= end)) results.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + step);
      }
      break;
    }
  }

  return results;
}

// Count how many MONTHLY payments remain (including the current month if not
// yet passed). For non-monthly frequencies, best-effort by date.
function computePaymentsRemaining(
  recurring: RecurringInput,
  year: number,
  month: number,
): number | null {
  if (!recurring.endDate) return null;
  const end = toDate(recurring.endDate);
  const start = toDate(recurring.startDate);
  const mStart = monthStart(year, month);
  if (end < mStart) return 0;

  if (recurring.frequency === "MONTHLY" || recurring.frequency === "YEARLY") {
    // Count month-aligned occurrences between current month and end date
    let count = 0;
    const cursor = new Date(year, month - 1, 1);
    while (cursor <= end) {
      const occ = occurrencesInMonth(recurring, cursor.getFullYear(), cursor.getMonth() + 1);
      count += occ.length;
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return count;
  }

  // WEEKLY / BI_WEEKLY — count occurrences from today (or month start) to end
  const step = recurring.frequency === "WEEKLY" ? 7 : 14;
  const anchor = start > mStart ? start : mStart;
  const daysFromStart = Math.max(0, diffDays(anchor, start));
  const delta = daysFromStart % step;
  const offset = delta === 0 ? 0 : step - delta;
  const cursor = new Date(start);
  cursor.setDate(start.getDate() + daysFromStart + offset);
  let count = 0;
  while (cursor <= end) {
    count += 1;
    cursor.setDate(cursor.getDate() + step);
  }
  return count;
}

// ── Transaction matching ─────────────────────────────────────────────────────

const MATCH_WINDOW_DAYS = 7;

/**
 * Match a recurring occurrence to a real transaction.
 * Criteria: same category, EXPENSE, within ±7 days of due, amount within 5% or $2.
 * Scoring: smaller date diff wins; ties broken by smaller amount diff.
 */
function findBestMatch(
  occurrence: Date,
  expected: number,
  categoryId: string,
  pool: TransactionInput[],
  used: Set<string>,
): TransactionInput | null {
  let best: TransactionInput | null = null;
  let bestDateDiff = Infinity;
  let bestAmountDiff = Infinity;

  for (const t of pool) {
    if (used.has(t.id)) continue;
    if (t.categoryId !== categoryId) continue;
    if (t.type !== "EXPENSE") continue;

    const tDate = toDate(t.date);
    const dateDiff = Math.abs(diffDays(tDate, occurrence));
    if (dateDiff > MATCH_WINDOW_DAYS) continue;

    const amountDiff = Math.abs(t.amount - expected);
    const pctDiff = expected > 0 ? amountDiff / expected : 1;
    if (amountDiff > 200 && pctDiff > 0.05) continue;

    if (
      dateDiff < bestDateDiff ||
      (dateDiff === bestDateDiff && amountDiff < bestAmountDiff)
    ) {
      best = t;
      bestDateDiff = dateDiff;
      bestAmountDiff = amountDiff;
    }
  }

  return best;
}

// ── Public API ───────────────────────────────────────────────────────────────

export function computeMonthOccurrences(
  recurring: RecurringInput[],
  transactions: TransactionInput[],
  year: number,
  month: number,
): RecurringOccurrence[] {
  const used = new Set<string>();
  const results: RecurringOccurrence[] = [];

  // Process in priority order so larger/rarer items get first pick of matches.
  const sorted = [...recurring].sort((a, b) => b.amount - a.amount);

  for (const item of sorted) {
    const dueDates = occurrencesInMonth(item, year, month);
    if (dueDates.length === 0) {
      results.push({
        recurring: item,
        dueDate: toDate(item.startDate),
        dueDates: [],
        expectedAmount: 0,
        matchedTransaction: null,
        paidAmount: 0,
        isPaid: false,
        paymentsRemaining: computePaymentsRemaining(item, year, month),
      });
      continue;
    }

    const perOccurrence = item.amount;
    const expected = perOccurrence * dueDates.length;

    // Match each occurrence independently so weekly/bi-weekly items can count
    // multiple matched transactions.
    let paid = 0;
    let firstMatch: TransactionInput | null = null;
    for (const occ of dueDates) {
      const match = findBestMatch(occ, perOccurrence, item.categoryId, transactions, used);
      if (match) {
        used.add(match.id);
        paid += match.amount;
        if (!firstMatch) firstMatch = match;
      }
    }

    results.push({
      recurring: item,
      dueDate: dueDates[0],
      dueDates,
      expectedAmount: expected,
      matchedTransaction: firstMatch,
      paidAmount: paid,
      isPaid: paid >= expected && expected > 0,
      paymentsRemaining: computePaymentsRemaining(item, year, month),
    });
  }

  // Restore original order (by category, then startDate, then name)
  results.sort((a, b) => {
    if (a.recurring.categoryId !== b.recurring.categoryId) {
      return a.recurring.categoryId.localeCompare(b.recurring.categoryId);
    }
    return a.recurring.name.localeCompare(b.recurring.name);
  });

  return results;
}

// Helper: total expected cents for a set of occurrences.
export function sumExpected(occurrences: RecurringOccurrence[]): number {
  return occurrences.reduce((s, o) => s + o.expectedAmount, 0);
}

// Helper: occurrences grouped by categoryId.
export function groupByCategory(
  occurrences: RecurringOccurrence[],
): Map<string, RecurringOccurrence[]> {
  const map = new Map<string, RecurringOccurrence[]>();
  for (const o of occurrences) {
    const list = map.get(o.recurring.categoryId) ?? [];
    list.push(o);
    map.set(o.recurring.categoryId, list);
  }
  return map;
}

// Safe fetchers: return [] on any failure (stale Prisma client, missing table,
// pending migration). This keeps backwards compatibility during partial rollouts.

type SafeFetchOptions = {
  userId: string;
  activeOnly?: boolean;
  withCategoryName?: boolean;
};

type SafeRecurringRecord = {
  id: string;
  name: string;
  amount: number;
  frequency: RecurringFrequency;
  dayOfMonth: number | null;
  startDate: Date;
  endDate: Date | null;
  active: boolean;
  categoryId: string;
  bankAccountId: string | null;
  notes: string | null;
  category?: { id: string; name: string };
};

export async function safeFetchRecurring(
  options: SafeFetchOptions,
): Promise<SafeRecurringRecord[]> {
  // Guard against stale client (hot-reloaded dev server where the generated
  // client was refreshed on disk but global.prisma still holds an old instance).
  const delegate = (prisma as unknown as { recurringExpense?: { findMany: (args: unknown) => Promise<SafeRecurringRecord[]> } }).recurringExpense;
  if (!delegate) return [];

  try {
    const where: Record<string, unknown> = { userId: options.userId };
    if (options.activeOnly) where.active = true;

    const findArgs: Record<string, unknown> = {
      where,
      orderBy: [{ categoryId: "asc" }, { name: "asc" }],
    };
    if (options.withCategoryName) {
      findArgs.include = { category: { select: { id: true, name: true } } };
    }

    return await delegate.findMany(findArgs);
  } catch (err) {
    // Most likely the migration hasn't been applied yet (e.g. rolling deploy).
    // Log once and return empty so the page still renders.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[recurring] safeFetchRecurring failed, returning [].", err);
    }
    return [];
  }
}

// Helper: find upcoming occurrences over the next N days starting from `from`.
// Crosses month boundaries as needed.
export function upcomingOccurrences(
  recurring: RecurringInput[],
  from: Date,
  days: number,
): { recurring: RecurringInput; dueDate: Date }[] {
  const until = new Date(from);
  until.setDate(until.getDate() + days);

  const results: { recurring: RecurringInput; dueDate: Date }[] = [];

  // Walk up to 3 months forward to cover any window ≤ ~90 days
  let cursorYear = from.getFullYear();
  let cursorMonth = from.getMonth() + 1;
  for (let i = 0; i < 4; i++) {
    for (const item of recurring) {
      for (const d of occurrencesInMonth(item, cursorYear, cursorMonth)) {
        if (d >= from && d <= until) results.push({ recurring: item, dueDate: d });
      }
    }
    cursorMonth += 1;
    if (cursorMonth > 12) {
      cursorMonth = 1;
      cursorYear += 1;
    }
  }

  results.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  return results;
}

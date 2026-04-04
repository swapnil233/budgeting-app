"use client";

import { formatCurrency } from "@/lib/utils";
import type { ReportsData } from "./reports-data";
import { INCOME_CAT_COLORS } from "./reports-data";


export function IncomeTab({ data }: { data: ReportsData }) {
  const {
    totalIncome,
    totalExpenses,
    incomeByCategory,
    stats,
  } = data;

  if (totalIncome === 0) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        No income transactions yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Transactions */}
        <div className="rounded-lg border bg-card p-4 flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Transactions</p>
          <p className="text-3xl font-bold tabular-nums">{stats.totalTxns}</p>
          <p className="text-sm text-muted-foreground">
            <span className="text-green-600 dark:text-green-400 font-medium">{stats.incomeTxns} income</span>
            {" · "}
            {stats.totalTxns - stats.incomeTxns} expenses
          </p>
        </div>

        {/* Total income */}
        <div className="rounded-lg border bg-card p-4 flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total income</p>
          <p className="text-3xl font-bold tabular-nums text-green-600 dark:text-green-400">
            +{formatCurrency(totalIncome)}
          </p>
        </div>

        {/* Total spending */}
        <div className="rounded-lg border bg-card p-4 flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total spending</p>
          <p className="text-3xl font-bold tabular-nums">{formatCurrency(totalExpenses)}</p>
        </div>
      </div>

      {/* Top income sources */}
      {incomeByCategory.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
            Income Sources
          </p>
          <div className="space-y-2.5">
            {incomeByCategory.map((cat, i) => (
              <div key={cat.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-sm"
                      style={{ background: INCOME_CAT_COLORS[i % INCOME_CAT_COLORS.length] }}
                    />
                    <span className="font-medium">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-3 tabular-nums">
                    <span className="text-xs text-muted-foreground">{cat.pct}%</span>
                    <span className="text-green-600 dark:text-green-400">
                      +{formatCurrency(cat.amount)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${cat.pct}%`,
                      background: INCOME_CAT_COLORS[i % INCOME_CAT_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

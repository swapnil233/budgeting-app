"use client";

import { formatCurrency } from "@/lib/utils";
import type { ReportsData } from "./reports-data";
import { INCOME_CAT_COLORS } from "./reports-data";

function SummaryRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium tabular-nums ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}

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

  const formatDate = (d: Date | null) =>
    d ? d.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <div className="space-y-6">
      {/* Summary panel */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-semibold mb-3">Summary</p>
        <SummaryRow label="Total transactions" value={String(stats.totalTxns)} />
        <SummaryRow label="Income transactions" value={String(stats.incomeTxns)} />
        <SummaryRow
          label="Largest income"
          value={`+${formatCurrency(stats.largest)}`}
          valueClass="text-green-600 dark:text-green-400"
        />
        <SummaryRow
          label="Average income"
          value={`+${formatCurrency(stats.avgIncome)}`}
          valueClass="text-green-600 dark:text-green-400"
        />
        <SummaryRow
          label="Total income"
          value={`+${formatCurrency(totalIncome)}`}
          valueClass="text-green-600 dark:text-green-400"
        />
        <SummaryRow label="Total spending" value={formatCurrency(totalExpenses)} />
        <SummaryRow label="First transaction" value={formatDate(stats.firstDate)} />
        <SummaryRow label="Last transaction" value={formatDate(stats.lastDate)} />
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

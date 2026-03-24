"use client";

import { formatCurrency } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
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
    monthlyIncomeData,
    incomeCatNames,
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
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Monthly stacked bar chart */}
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
            Income by Month
          </p>
          <p className="text-sm text-muted-foreground mb-4">by source</p>
          {monthlyIncomeData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyIncomeData} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tickFormatter={(v) => `$${(v / 100).toFixed(0)}`}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(var(--muted-foreground))"
                  width={56}
                />
                <Tooltip
                  formatter={(v: unknown, name: unknown) => [formatCurrency(Number(v)), String(name)]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 6,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                  }}
                />
                <Legend iconType="rect" wrapperStyle={{ fontSize: 12 }} />
                {incomeCatNames.map((name, i) => (
                  <Bar
                    key={name}
                    dataKey={name}
                    stackId="income"
                    fill={INCOME_CAT_COLORS[i % INCOME_CAT_COLORS.length]}
                    radius={i === incomeCatNames.length - 1 ? [3, 3, 0, 0] : undefined}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Summary panel */}
        <div className="rounded-lg border bg-card p-4 h-fit">
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
          <SummaryRow
            label="Total spending"
            value={formatCurrency(totalExpenses)}
          />
          <SummaryRow
            label="First transaction"
            value={formatDate(stats.firstDate)}
          />
          <SummaryRow
            label="Last transaction"
            value={formatDate(stats.lastDate)}
          />
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

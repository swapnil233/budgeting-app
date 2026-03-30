"use client";

import { formatCurrency } from "@/lib/utils";
import type { ReportsData } from "./reports-data";

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-1">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className="text-2xl font-bold tabular-nums"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

// ── Flow visualization (income sources → expense groups) ──────────────────────

function FlowRow({
  name,
  amount,
  total,
  color,
}: {
  name: string;
  amount: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="w-36 h-5 rounded-sm overflow-hidden bg-muted/40">
        <div
          className="h-full rounded-sm"
          style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.85 }}
        />
      </div>
      <div className="flex-1">
        <span className="font-medium">{name}</span>
        <span className="ml-2 text-xs text-muted-foreground">
          {formatCurrency(amount)}
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CashFlowTab({ data }: { data: ReportsData }) {
  const { totalIncome, totalExpenses, net, savingsRate, incomeFlows, expenseFlows } = data;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Income" value={formatCurrency(totalIncome)} color="#22c55e" />
        <StatCard label="Total Expenses" value={formatCurrency(totalExpenses)} color="#ef4444" />
        <StatCard
          label="Net"
          value={(net >= 0 ? "+" : "") + formatCurrency(net)}
          color={net >= 0 ? "#22c55e" : "#ef4444"}
        />
        <StatCard
          label="Savings Rate"
          value={`${savingsRate}%`}
          color={savingsRate >= 20 ? "#22c55e" : savingsRate >= 0 ? "#f59e0b" : "#ef4444"}
        />
      </div>

      {/* Flow breakdown */}
      {(incomeFlows.length > 0 || expenseFlows.length > 0) && (
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
            Cash Flow Breakdown
          </p>
          <div className="grid grid-cols-2 gap-8">
            {/* Income sources */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-3">
                INCOME SOURCES
              </p>
              {incomeFlows.map((src) => (
                <FlowRow
                  key={src.id}
                  name={src.name}
                  amount={src.amount}
                  total={totalIncome}
                  color="#22c55e"
                />
              ))}
            </div>

            {/* Expense groups */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-red-500 mb-3">
                EXPENSE GROUPS
              </p>
              {expenseFlows.map((grp) => (
                <FlowRow
                  key={grp.group}
                  name={grp.name}
                  amount={grp.amount}
                  total={totalExpenses}
                  color={grp.color}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

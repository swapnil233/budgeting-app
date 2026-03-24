"use client";

import { formatCurrency } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReportsData } from "./reports-data";
import { GROUP_COLORS } from "./reports-data";

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
  align,
}: {
  name: string;
  amount: number;
  total: number;
  color: string;
  align: "left" | "right";
}) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      {align === "right" && (
        <>
          <div className="flex-1 text-right">
            <span className="font-medium">{name}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {formatCurrency(amount)}
            </span>
          </div>
          <div className="w-36 h-5 rounded-sm overflow-hidden bg-muted/40">
            <div
              className="h-full rounded-sm"
              style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.85 }}
            />
          </div>
        </>
      )}
      {align === "left" && (
        <>
          <div className="w-36 h-5 rounded-sm overflow-hidden bg-muted/40 flex justify-end">
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
        </>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const currencyFormatter = (v: number) => formatCurrency(v);

export function CashFlowTab({ data }: { data: ReportsData }) {
  const { totalIncome, totalExpenses, net, savingsRate, monthlyData, incomeFlows, expenseFlows } = data;

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

      {/* Monthly bar chart */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
          Monthly Cash Flow
        </p>
        {monthlyData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} barGap={2} barCategoryGap="28%">
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
                formatter={(v: unknown, name: unknown) => [
                  formatCurrency(Number(v)),
                  name === "income" ? "Income" : name === "expense" ? "Expenses" : "Net",
                ]}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                }}
              />
              <Legend
                formatter={(v) =>
                  v === "income" ? "Income" : v === "expense" ? "Expenses" : "Net"
                }
                iconType="rect"
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="income" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expense" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
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
                  align="left"
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
                  align="right"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

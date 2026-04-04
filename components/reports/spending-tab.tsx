"use client";

import { formatCurrency } from "@/lib/utils";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import type { ReportsData } from "./reports-data";
import { GROUP_COLORS, GROUP_LABELS } from "./reports-data";
import { useTheme } from "next-themes";

const RADIAN = Math.PI / 180;
function PieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}: any) {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={11} fill="#fff" fontWeight={500}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function SpendingTab({ data }: { data: ReportsData }) {
  const { spendByGroup, topCategories, totalExpenses } = data;
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const mutedColor = dark ? "#8a98c8" : "#6b79a8";
  const fgColor = dark ? "#f3f2ff" : "#1a1528";
  const tooltipStyle = {
    fontSize: 12,
    borderRadius: 6,
    border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "#dde1f0"}`,
    background: dark ? "#1c1a2e" : "#ffffff",
    color: fgColor,
  };

  if (totalExpenses === 0) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        No expense transactions yet.
      </div>
    );
  }

  const donutData = spendByGroup.map((g) => ({
    name: g.name,
    value: g.amount,
    color: g.color,
  }));

  return (
    <div className="space-y-6">
      {/* Donut + group breakdown */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
          Spending by Group
        </p>
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          {/* Donut chart */}
          <div className="shrink-0 w-full md:w-64 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  labelLine={false}
                  label={PieLabel}
                >
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: unknown) => formatCurrency(Number(v))}
                  contentStyle={tooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Group breakdown list */}
          <div className="flex-1 space-y-2.5">
            {spendByGroup.map((g) => (
              <div key={g.group} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-sm"
                      style={{ background: g.color }}
                    />
                    <span className="font-medium">{g.name}</span>
                  </div>
                  <div className="flex items-center gap-3 tabular-nums">
                    <span className="text-xs text-muted-foreground">{g.pct}%</span>
                    <span>{formatCurrency(g.amount)}</span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${g.pct}%`, background: g.color }}
                  />
                </div>
              </div>
            ))}
            <div className="border-t pt-2 mt-1 flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span>{formatCurrency(totalExpenses)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top categories bar chart */}
      {topCategories.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
            Top Categories
          </p>
          <ResponsiveContainer width="100%" height={topCategories.length * 36 + 20}>
            <BarChart
              data={topCategories.map((c) => ({ name: c.name, amount: c.amount, color: GROUP_COLORS[c.group] }))}
              layout="vertical"
              barCategoryGap="22%"
              margin={{ left: 0, right: 80 }}
            >
              <XAxis
                type="number"
                tickFormatter={(v) => `$${(v / 100).toFixed(0)}`}
                tick={{ fontSize: 10, fill: mutedColor }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: fgColor }}
                tickLine={false}
                axisLine={false}
                width={130}
              />
              <Tooltip
                formatter={(v: unknown) => [formatCurrency(Number(v)), "Spent"]}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="amount" radius={[0, 3, 3, 0]} label={{ position: "right", fontSize: 11, fill: fgColor, formatter: (v: unknown) => formatCurrency(Number(v)) }}>
                {topCategories.map((c, i) => (
                  <Cell key={i} fill={GROUP_COLORS[c.group]} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type BudgetRow = {
  categoryName: string;
  budgetAmount: number;
  spent: number;
};

interface BudgetBarChartProps {
  rows: BudgetRow[];
}

export function BudgetBarChart({ rows }: BudgetBarChartProps) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const mutedColor = dark ? "#8a98c8" : "#6b79a8";
  const tooltipStyle = {
    fontSize: 12,
    border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "#dde1f0"}`,
    background: dark ? "#1c1a2e" : "#ffffff",
    color: dark ? "#f3f2ff" : "#1a1528",
  };

  const chartData = rows
    .filter((r) => r.budgetAmount > 0)
    .map((r) => ({
      name: r.categoryName,
      Budget: r.budgetAmount / 100,
      Spent: r.spent / 100,
    }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actual</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          No budget data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget vs Actual</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: mutedColor }}
              angle={-45}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 11, fill: mutedColor }}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value) * 100)}
              contentStyle={tooltipStyle}
            />
            <Legend verticalAlign="top" />
            <Bar dataKey="Budget" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Spent" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

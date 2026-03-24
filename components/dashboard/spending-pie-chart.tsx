"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const GROUP_COLORS: Record<string, string> = {
  FIXED: "#6366f1",
  SUBSCRIPTIONS: "#8b5cf6",
  FOOD: "#f59e0b",
  LIFESTYLE: "#10b981",
  PEOPLE_AND_PETS: "#ec4899",
  OTHER: "#6b7280",
};

const GROUP_LABELS: Record<string, string> = {
  FIXED: "Fixed",
  SUBSCRIPTIONS: "Subscriptions",
  FOOD: "Food",
  LIFESTYLE: "Lifestyle",
  PEOPLE_AND_PETS: "People & Pets",
  OTHER: "Other",
};

interface SpendingPieChartProps {
  data: { group: string; spent: number }[];
}

export function SpendingPieChart({ data }: SpendingPieChartProps) {
  const chartData = data
    .filter((d) => d.spent > 0)
    .map((d) => ({
      name: GROUP_LABELS[d.group] ?? d.group,
      value: d.spent,
      group: d.group,
    }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          No spending data for this month.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={100}
              dataKey="value"
              label={({ name, percent }) =>
                `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.group}
                  fill={GROUP_COLORS[entry.group] ?? "#6b7280"}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

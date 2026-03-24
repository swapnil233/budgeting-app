"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DayPoint = {
  day: number;
  thisMonth: number;
  lastMonth: number;
};

interface SpendingLineChartProps {
  data: DayPoint[];
  totalThisMonth: number;
  month: number;
  year: number;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export function SpendingLineChart({ data, totalThisMonth, month, year }: SpendingLineChartProps) {
  // Only render up to today if current month
  const now = new Date();
  const isCurrentMonth = now.getMonth() + 1 === month && now.getFullYear() === year;
  const cutoffDay = isCurrentMonth ? now.getDate() : data.length;
  const visibleData = data.map((d) => ({
    ...d,
    thisMonth: d.day <= cutoffDay ? d.thisMonth : null,
  }));

  return (
    <Card className="flex flex-col gap-0 py-0 overflow-hidden">
      <CardHeader className="px-5 py-4 border-b">
        <div className="flex items-baseline gap-2">
          <CardTitle className="text-base font-semibold">Spending</CardTitle>
          <span className="text-sm text-muted-foreground">
            {formatCurrency(totalThisMonth)} this month
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">This month vs. last month</p>
      </CardHeader>
      <CardContent className="px-2 pt-4 pb-2">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={visibleData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorLast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorThis" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(d) => `${d}`}
              interval={Math.floor(data.length / 6)}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v}`}
              width={48}
            />
            <Tooltip
              formatter={(value, name) => [
                formatCurrency(Number(value) * 100),
                name === "thisMonth" ? MONTHS[month - 1] : MONTHS[month === 1 ? 11 : month - 2],
              ]}
              labelFormatter={(day) => `Day ${day}`}
              contentStyle={{ fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="lastMonth"
              stroke="#94a3b8"
              strokeWidth={1.5}
              fill="url(#colorLast)"
              dot={false}
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="thisMonth"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#colorThis)"
              dot={false}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-4 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded bg-slate-400" />
            Last month
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded bg-indigo-500" />
            This month
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

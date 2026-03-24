"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, cn } from "@/lib/utils";

const GROUP_LABELS: Record<string, string> = {
  FIXED: "Fixed",
  SUBSCRIPTIONS: "Subscriptions",
  FOOD: "Food",
  LIFESTYLE: "Lifestyle",
  PEOPLE_AND_PETS: "People & Pets",
  OTHER: "Other",
};

const GROUP_ORDER = ["FIXED", "SUBSCRIPTIONS", "FOOD", "LIFESTYLE", "PEOPLE_AND_PETS", "OTHER"];

type GroupSummary = {
  group: string;
  budgetAmount: number;
  spent: number;
};

interface BudgetGroupsCardProps {
  groups: GroupSummary[];
  month: number;
  year: number;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export function BudgetGroupsCard({ groups, month, year }: BudgetGroupsCardProps) {
  const sorted = GROUP_ORDER.map((g) => groups.find((x) => x.group === g)).filter(Boolean) as GroupSummary[];
  const visible = sorted.filter((g) => g.budgetAmount > 0 || g.spent > 0);

  return (
    <Card className="flex flex-col gap-0 py-0 overflow-hidden">
      <CardHeader className="px-5 py-4 border-b">
        <div className="flex items-baseline gap-2">
          <CardTitle className="text-base font-semibold">Budget</CardTitle>
          <span className="text-sm text-muted-foreground">{MONTHS[month - 1]} {year}</span>
        </div>
      </CardHeader>
      <CardContent className="px-5 py-0 divide-y">
        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No budget data. Add categories with budgets to get started.
          </p>
        ) : (
          visible.map((g) => {
            const pct = g.budgetAmount > 0 ? (g.spent / g.budgetAmount) * 100 : 100;
            const barWidth = Math.min(pct, 100);
            const over = g.spent > g.budgetAmount && g.budgetAmount > 0;
            const close = pct >= 80 && pct <= 100;
            const remaining = g.budgetAmount - g.spent;

            return (
              <div key={g.group} className="py-4 flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{GROUP_LABELS[g.group]}</span>
                  <span className="text-muted-foreground text-xs">
                    {g.budgetAmount > 0 ? `${formatCurrency(g.budgetAmount)} budget` : "No budget"}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      over ? "bg-red-500" : close ? "bg-amber-400" : "bg-primary"
                    )}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{formatCurrency(g.spent)} spent</span>
                  {g.budgetAmount > 0 && (
                    <span className={cn("font-medium", over ? "text-red-500" : "text-green-600")}>
                      {over ? "−" : "+"}{formatCurrency(Math.abs(remaining))} remaining
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

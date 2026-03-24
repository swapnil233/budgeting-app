"use client";

import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

type BudgetRow = {
  categoryId: string;
  categoryName: string;
  group: string;
  budgetAmount: number;
  spent: number;
  left: number;
  percentage: number;
  status: "OK" | "CLOSE" | "OVER";
};

const GROUP_LABELS: Record<string, string> = {
  FIXED: "Fixed",
  SUBSCRIPTIONS: "Subscriptions",
  FOOD: "Food",
  LIFESTYLE: "Lifestyle",
  PEOPLE_AND_PETS: "People & Pets",
  OTHER: "Other",
};

const GROUP_ORDER = ["FIXED", "SUBSCRIPTIONS", "FOOD", "LIFESTYLE", "PEOPLE_AND_PETS", "OTHER"];

function StatusBadge({ status }: { status: "OK" | "CLOSE" | "OVER" }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-xs font-medium",
        status === "OK" && "bg-green-100 text-green-700",
        status === "CLOSE" && "bg-amber-100 text-amber-700",
        status === "OVER" && "bg-red-100 text-red-700"
      )}
    >
      {status}
    </span>
  );
}

interface BudgetTableProps {
  rows: BudgetRow[];
  totalInflow: number;
  totalExpenses: number;
  netPosition: number;
}

export function BudgetTable({ rows, totalInflow, totalExpenses, netPosition }: BudgetTableProps) {
  const rowsByGroup = GROUP_ORDER.reduce<Record<string, BudgetRow[]>>((acc, group) => {
    acc[group] = rows.filter((r) => r.group === group);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      {GROUP_ORDER.map((group) => {
        const groupRows = rowsByGroup[group];
        if (!groupRows || groupRows.length === 0) return null;

        const groupBudget = groupRows.reduce((s, r) => s + r.budgetAmount, 0);
        const groupSpent = groupRows.reduce((s, r) => s + r.spent, 0);
        const groupLeft = groupBudget - groupSpent;

        return (
          <div key={group} className="rounded-lg border overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 border-b">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                {GROUP_LABELS[group]}
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground text-xs">
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 font-medium text-right">Budget</th>
                  <th className="px-4 py-2 font-medium text-right">Spent</th>
                  <th className="px-4 py-2 font-medium text-right">Left</th>
                  <th className="px-4 py-2 font-medium text-right hidden md:table-cell">%</th>
                  <th className="px-4 py-2 font-medium hidden md:table-cell">Status</th>
                </tr>
              </thead>
              <tbody>
                {groupRows.map((row) => (
                  <tr key={row.categoryId} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5">{row.categoryName}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                      {row.budgetAmount > 0 ? formatCurrency(row.budgetAmount) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {row.spent > 0 ? formatCurrency(row.spent) : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2.5 text-right tabular-nums",
                        row.budgetAmount > 0 && row.left < 0 ? "text-red-600" : "text-green-600"
                      )}
                    >
                      {row.budgetAmount > 0 ? formatCurrency(row.left) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right hidden md:table-cell text-muted-foreground">
                      {row.budgetAmount > 0 ? `${row.percentage}%` : "—"}
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      {row.budgetAmount > 0 ? <StatusBadge status={row.status} /> : null}
                    </td>
                  </tr>
                ))}
                {/* Subtotal row */}
                <tr className="border-t bg-muted/30 font-medium text-xs text-muted-foreground">
                  <td className="px-4 py-2">Subtotal</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {groupBudget > 0 ? formatCurrency(groupBudget) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(groupSpent)}</td>
                  <td
                    className={cn(
                      "px-4 py-2 text-right tabular-nums",
                      groupBudget > 0 && groupLeft < 0 ? "text-red-600" : "text-green-600"
                    )}
                  >
                    {groupBudget > 0 ? formatCurrency(groupLeft) : "—"}
                  </td>
                  <td className="px-4 py-2 hidden md:table-cell" colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}

      {/* Summary */}
      <div className="rounded-lg border overflow-hidden">
        <div className="bg-muted/50 px-4 py-2 border-b">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            Summary
          </h3>
        </div>
        <div className="divide-y">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium">Total Inflow</span>
            <span className="tabular-nums font-medium text-green-600">
              {formatCurrency(totalInflow)}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium">Total Expenses</span>
            <span className="tabular-nums font-medium text-red-600">
              {formatCurrency(totalExpenses)}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium">Net Position</span>
            <span
              className={cn(
                "tabular-nums font-bold text-base",
                netPosition >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {formatCurrency(netPosition)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

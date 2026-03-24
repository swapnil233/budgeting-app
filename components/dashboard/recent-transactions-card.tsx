import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, cn } from "@/lib/utils";
import Link from "next/link";

type Transaction = {
  id: string;
  merchant: string;
  amount: number;
  type: "EXPENSE" | "INCOME";
  date: Date | string;
  category: { name: string };
};

interface RecentTransactionsCardProps {
  transactions: Transaction[];
  month: number;
  year: number;
}

export function RecentTransactionsCard({ transactions, month, year }: RecentTransactionsCardProps) {
  return (
    <Card className="flex flex-col gap-0 py-0 overflow-hidden">
      <CardHeader className="px-5 py-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <CardTitle className="text-base font-semibold">Transactions</CardTitle>
            <span className="text-sm text-muted-foreground">Most recent</span>
          </div>
          <Link
            href={`/dashboard/transactions?month=${month}&year=${year}`}
            className="text-xs text-primary hover:underline"
          >
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-0 py-0">
        {transactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No transactions this month.
          </p>
        ) : (
          <ul className="divide-y">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                {/* Merchant initial avatar */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase text-muted-foreground">
                  {t.merchant.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{t.merchant}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.category.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn(
                    "text-sm font-medium tabular-nums",
                    t.type === "INCOME" ? "text-green-600" : ""
                  )}>
                    {t.type === "INCOME" ? "+" : "−"}{formatCurrency(t.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.date).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

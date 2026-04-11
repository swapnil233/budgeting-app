import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Calendar } from "lucide-react";
import Link from "next/link";

export type UpcomingBill = {
  id: string;
  name: string;
  amount: number;
  dueDate: string; // ISO
  categoryName: string;
};

interface UpcomingBillsCardProps {
  bills: UpcomingBill[];
  windowDays: number;
}

const DATE_FMT = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric" });

function daysUntil(iso: string): number {
  const due = new Date(iso);
  due.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function relativeDue(iso: string): string {
  const d = daysUntil(iso);
  if (d < 0) return `${Math.abs(d)}d ago`;
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  return `in ${d}d`;
}

export function UpcomingBillsCard({ bills, windowDays }: UpcomingBillsCardProps) {
  const total = bills.reduce((s, b) => s + b.amount, 0);

  return (
    <Card className="flex flex-col gap-0 py-0 overflow-hidden">
      <CardHeader className="px-5 py-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <CardTitle className="text-base font-semibold">Upcoming Bills</CardTitle>
            <span className="text-sm text-muted-foreground">Next {windowDays} days</span>
          </div>
          <Link
            href="/dashboard/budgets"
            className="text-xs text-primary hover:underline"
          >
            Manage
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-0 py-0">
        {bills.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Nothing due in the next {windowDays} days.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/20">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Total due
              </span>
              <span className="tabular-nums font-semibold text-sm">
                {formatCurrency(total)}
              </span>
            </div>
            <ul className="divide-y">
              {bills.map((b) => (
                <li
                  key={`${b.id}-${b.dueDate}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase text-muted-foreground">
                    {b.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{b.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {b.categoryName}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium tabular-nums">
                      {formatCurrency(b.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {DATE_FMT.format(new Date(b.dueDate))} · {relativeDue(b.dueDate)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

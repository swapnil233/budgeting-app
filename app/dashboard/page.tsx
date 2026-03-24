import { BudgetGroupsCard } from "@/components/dashboard/budget-groups-card";
import { SpendingLineChart } from "@/components/dashboard/spending-line-chart";
import { RecentTransactionsCard } from "@/components/dashboard/recent-transactions-card";
import { MonthSelector } from "@/components/shared/month-selector";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { formatCurrency, cn } from "@/lib/utils";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const GROUP_ORDER = ["FIXED", "SUBSCRIPTIONS", "FOOD", "LIFESTYLE", "PEOPLE_AND_PETS", "OTHER"];

function buildDailyCumulative(
  transactions: { date: Date | string; amount: number; type: string }[],
  year: number,
  month: number
): number[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const daily = new Array(daysInMonth + 1).fill(0);
  for (const t of transactions) {
    if (t.type === "EXPENSE") {
      const day = new Date(t.date).getDate();
      if (day >= 1 && day <= daysInMonth) daily[day] += t.amount;
    }
  }
  const cumulative: number[] = [];
  let running = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    running += daily[d];
    cumulative.push(running);
  }
  return cumulative;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const { month: monthStr, year: yearStr } = await searchParams;
  const now = new Date();
  const month = parseInt(monthStr ?? String(now.getMonth() + 1));
  const year = parseInt(yearStr ?? String(now.getFullYear()));

  // Current month date range
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  // Last month date range
  const lastMonthDate = new Date(year, month - 2, 1);
  const lastStart = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 1);
  const lastEnd = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0, 23, 59, 59);

  const userId = session.user.id;

  const [categories, spendByCategory, inflow, currentTxns, lastMonthTxns, recentTxns] =
    await Promise.all([
      prisma.category.findMany({ where: { userId }, orderBy: [{ group: "asc" }, { name: "asc" }] }),
      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: { type: "EXPENSE", category: { userId }, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { type: "INCOME", category: { userId }, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        where: { category: { userId }, date: { gte: start, lte: end } },
        select: { date: true, amount: true, type: true },
      }),
      prisma.transaction.findMany({
        where: { category: { userId }, date: { gte: lastStart, lte: lastEnd } },
        select: { date: true, amount: true, type: true },
      }),
      prisma.transaction.findMany({
        where: { category: { userId }, date: { gte: start, lte: end } },
        include: { category: true },
        orderBy: { date: "desc" },
        take: 7,
      }),
    ]);

  // Budget groups
  const spendMap = new Map(spendByCategory.map((s) => [s.categoryId, s._sum.amount ?? 0]));
  const groupSpend: Record<string, number> = {};
  const groupBudget: Record<string, number> = {};
  for (const cat of categories) {
    groupSpend[cat.group] = (groupSpend[cat.group] ?? 0) + (spendMap.get(cat.id) ?? 0);
    groupBudget[cat.group] = (groupBudget[cat.group] ?? 0) + cat.budgetAmount;
  }
  const budgetGroups = GROUP_ORDER.map((g) => ({
    group: g,
    budgetAmount: groupBudget[g] ?? 0,
    spent: groupSpend[g] ?? 0,
  }));

  // Summary totals
  const totalInflow = inflow._sum.amount ?? 0;
  const totalExpenses = Object.values(groupSpend).reduce((s, v) => s + v, 0);
  const netPosition = totalInflow - totalExpenses;

  // Daily cumulative spending chart data
  const thisCumulative = buildDailyCumulative(currentTxns, year, month);
  const lastCumulative = buildDailyCumulative(lastMonthTxns, lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const chartData = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    thisMonth: (thisCumulative[i] ?? 0) / 100,
    lastMonth: (lastCumulative[i] ?? 0) / 100,
  }));

  const firstName = session.user.name.split(" ")[0];

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <span className="font-semibold">Dashboard</span>
        <div className="ml-auto">
          <MonthSelector month={month} year={year} />
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-5">
        {/* Welcome */}
        <div className="flex items-end justify-between">
          <h1 className="text-2xl font-bold">Welcome back, {firstName}!</h1>

          {/* Summary strip */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Inflow</p>
              <p className="font-semibold text-green-600">{formatCurrency(totalInflow)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Expenses</p>
              <p className="font-semibold text-red-500">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Net</p>
              <p className={cn("font-semibold", netPosition >= 0 ? "text-green-600" : "text-red-500")}>
                {formatCurrency(netPosition)}
              </p>
            </div>
          </div>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr] items-start">
          {/* Left: budget groups */}
          <BudgetGroupsCard groups={budgetGroups} month={month} year={year} />

          {/* Right: spending chart + recent transactions */}
          <div className="flex flex-col gap-4">
            <SpendingLineChart
              data={chartData}
              totalThisMonth={totalExpenses}
              month={month}
              year={year}
            />
            <RecentTransactionsCard
              transactions={recentTxns}
              month={month}
              year={year}
            />
          </div>
        </div>
      </div>
    </>
  );
}

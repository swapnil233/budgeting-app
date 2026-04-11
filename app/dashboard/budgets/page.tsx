import { BudgetTable } from "@/components/budgets/budget-table";
import { MonthSelector } from "@/components/shared/month-selector";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  computeMonthOccurrences,
  groupByCategory,
  safeFetchRecurring,
  type RecurringInput,
  type TransactionInput,
} from "@/lib/recurring";

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const userId = session.user.id;

  const { month: monthStr, year: yearStr } = await searchParams;
  const now = new Date();
  const month = parseInt(monthStr ?? String(now.getMonth() + 1));
  const year = parseInt(yearStr ?? String(now.getFullYear()));

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const [categories, spendByCategory, inflowTotal, recurring, monthTxns] = await Promise.all([
    prisma.category.findMany({ where: { userId }, orderBy: [{ group: "asc" }, { name: "asc" }] }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        type: "EXPENSE",
        category: { userId: session.user.id },
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        type: "INCOME",
        category: { userId: session.user.id },
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    }),
    safeFetchRecurring({ userId }),
    prisma.transaction.findMany({
      where: {
        type: "EXPENSE",
        category: { userId },
        date: { gte: start, lte: end },
      },
      select: { id: true, date: true, amount: true, type: true, categoryId: true, merchant: true },
    }),
  ]);

  const spendMap = new Map(
    spendByCategory.map((s) => [s.categoryId, s._sum.amount ?? 0])
  );

  const recurringInput: RecurringInput[] = recurring.map((r) => ({
    id: r.id,
    name: r.name,
    amount: r.amount,
    frequency: r.frequency,
    dayOfMonth: r.dayOfMonth,
    startDate: r.startDate,
    endDate: r.endDate,
    active: r.active,
    categoryId: r.categoryId,
    bankAccountId: r.bankAccountId,
    notes: r.notes,
  }));

  const txnInput: TransactionInput[] = monthTxns.map((t) => ({
    id: t.id,
    date: t.date,
    amount: t.amount,
    type: t.type,
    categoryId: t.categoryId,
    merchant: t.merchant,
  }));

  const occurrences = computeMonthOccurrences(recurringInput, txnInput, year, month);
  const occurrencesByCategory = groupByCategory(occurrences);

  const rows = categories.map((cat) => {
    const spent = spendMap.get(cat.id) ?? 0;
    const catOccurrences = occurrencesByCategory.get(cat.id) ?? [];
    const recurringExpected = catOccurrences.reduce((s, o) => s + o.expectedAmount, 0);
    const flexBudget = cat.budgetAmount;
    const effectiveBudget = flexBudget + recurringExpected;
    const left = effectiveBudget - spent;
    const percentage =
      effectiveBudget > 0 ? Math.round((spent / effectiveBudget) * 100) : 0;
    const status: "OK" | "CLOSE" | "OVER" =
      percentage > 100 ? "OVER" : percentage >= 80 ? "CLOSE" : "OK";

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      group: cat.group,
      flexBudget,
      recurringBudget: recurringExpected,
      budgetAmount: effectiveBudget,
      spent,
      left,
      percentage,
      status,
      recurring: catOccurrences.map((o) => ({
        id: o.recurring.id,
        name: o.recurring.name,
        amount: o.recurring.amount,
        expectedAmount: o.expectedAmount,
        paidAmount: o.paidAmount,
        isPaid: o.isPaid,
        frequency: o.recurring.frequency,
        dayOfMonth: o.recurring.dayOfMonth,
        startDate: o.recurring.startDate instanceof Date
          ? o.recurring.startDate.toISOString()
          : o.recurring.startDate,
        endDate:
          o.recurring.endDate instanceof Date
            ? o.recurring.endDate.toISOString()
            : o.recurring.endDate,
        dueDate: o.dueDate.toISOString(),
        paymentsRemaining: o.paymentsRemaining,
        active: o.recurring.active,
        categoryId: o.recurring.categoryId,
        bankAccountId: o.recurring.bankAccountId,
        notes: o.recurring.notes,
      })),
    };
  });

  const totalInflow = inflowTotal._sum.amount ?? 0;
  const totalExpenses = rows.reduce((sum, r) => sum + r.spent, 0);
  const netPosition = totalInflow - totalExpenses;

  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name, group: c.group }));

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Budgets</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto">
          <MonthSelector month={month} year={year} />
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <BudgetTable
          rows={rows}
          totalInflow={totalInflow}
          totalExpenses={totalExpenses}
          netPosition={netPosition}
          categories={categoryOptions}
        />
      </div>
    </>
  );
}

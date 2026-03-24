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

  const [categories, spendByCategory, inflowTotal] = await Promise.all([
    prisma.category.findMany({ where: { userId }, orderBy: [{ group: "asc" }, { name: "asc" }] }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        type: "EXPENSE",
        bankAccount: { userId: session.user.id },
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        type: "INCOME",
        bankAccount: { userId: session.user.id },
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    }),
  ]);

  const spendMap = new Map(
    spendByCategory.map((s) => [s.categoryId, s._sum.amount ?? 0])
  );

  const rows = categories.map((cat) => {
    const spent = spendMap.get(cat.id) ?? 0;
    const left = cat.budgetAmount - spent;
    const percentage =
      cat.budgetAmount > 0 ? Math.round((spent / cat.budgetAmount) * 100) : 0;
    const status: "OK" | "CLOSE" | "OVER" =
      percentage > 100 ? "OVER" : percentage >= 80 ? "CLOSE" : "OK";

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      group: cat.group,
      budgetAmount: cat.budgetAmount,
      spent,
      left,
      percentage,
      status,
    };
  });

  const totalInflow = inflowTotal._sum.amount ?? 0;
  const totalExpenses = rows.reduce((sum, r) => sum + r.spent, 0);
  const netPosition = totalInflow - totalExpenses;

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
        />
      </div>
    </>
  );
}

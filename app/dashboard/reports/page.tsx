import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ReportsTabs } from "@/components/reports/reports-tabs";
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

export default async function ReportsPage({
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

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const [transactions, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        category: { userId },
        date: { gte: start, lte: end },
      },
      include: {
        category: { select: { id: true, name: true, group: true, budgetAmount: true } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.category.findMany({
      where: { userId },
      orderBy: [{ group: "asc" }, { name: "asc" }],
    }),
  ]);

  const txns = transactions.map((t) => ({
    ...t,
    date: t.date.toISOString(),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Reports</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto">
          <MonthSelector month={month} year={year} />
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <ReportsTabs transactions={txns} categories={categories} />
      </div>
    </>
  );
}

import { TransactionsTable } from "@/components/transactions/transactions-table";
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

export default async function TransactionsPage({
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

  const [transactions, categories, bankAccounts] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        bankAccount: { userId: session.user.id },
        date: { gte: start, lte: end },
      },
      include: { category: true, bankAccount: true },
      orderBy: { date: "desc" },
    }),
    prisma.category.findMany({ where: { userId }, orderBy: [{ group: "asc" }, { name: "asc" }] }),
    prisma.bankAccount.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
    }),
  ]);

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
              <BreadcrumbPage>Transactions</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto">
          <MonthSelector month={month} year={year} />
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <TransactionsTable
          transactions={transactions}
          categories={categories}
          bankAccounts={bankAccounts}
        />
      </div>
    </>
  );
}

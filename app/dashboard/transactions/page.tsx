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
import { fetchTransactions, type SortField } from "@/lib/transactions";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    year?: string;
    page?: string;
    pageSize?: string;
    search?: string;
    sortBy?: string;
    sortDir?: string;
  }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const userId = session.user.id;

  const VALID_SORT_FIELDS: SortField[] = ["date", "amount", "merchant", "type", "category", "account", "notes"];

  const {
    month: monthStr,
    year: yearStr,
    page: pageStr,
    pageSize: pageSizeStr,
    search,
    sortBy: sortByStr,
    sortDir: sortDirStr,
  } = await searchParams;

  const now = new Date();
  const month = parseInt(monthStr ?? String(now.getMonth() + 1));
  const year = parseInt(yearStr ?? String(now.getFullYear()));
  const page = Math.max(1, parseInt(pageStr ?? "1"));
  const pageSize =
    pageSizeStr === "all" ? ("all" as const) : Math.max(1, parseInt(pageSizeStr ?? "20"));
  const sortBy = VALID_SORT_FIELDS.includes(sortByStr as SortField) ? (sortByStr as SortField) : "date";
  const sortDir = sortDirStr === "asc" ? "asc" as const : "desc" as const;

  const [{ transactions, total }, categories, bankAccounts] =
    await Promise.all([
      fetchTransactions({
        userId,
        month,
        year,
        page,
        pageSize,
        search: search || undefined,
        sortBy,
        sortDir,
      }),
      prisma.category.findMany({
        where: { userId },
        orderBy: [{ group: "asc" }, { name: "asc" }],
      }),
      prisma.bankAccount.findMany({
        where: { userId },
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
          initialData={{ transactions, total }}
          categories={categories}
          bankAccounts={bankAccounts}
          month={month}
          year={year}
          initialSearch={search ?? ""}
          initialPage={page}
          initialPageSize={pageSize}
          initialSortBy={sortBy}
          initialSortDir={sortDir}
        />
      </div>
    </>
  );
}

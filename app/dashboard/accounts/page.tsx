import { AccountsTable } from "@/components/accounts/accounts-table";
import { LinkedAccountsSection } from "@/components/plaid/LinkedAccountsSection";
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

export default async function AccountsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const [accounts, plaidItems, categories] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
    }),
    prisma.plaidItem.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      include: { plaidAccounts: { orderBy: { name: "asc" } } },
    }),
    prisma.category.findMany({
      where: { userId: session.user.id },
      orderBy: [{ group: "asc" }, { name: "asc" }],
      select: { id: true, name: true, group: true },
    }),
  ]);

  // Strip the encrypted access token before passing to the client.
  const safePlaidItems = plaidItems.map(({ accessTokenEncrypted: _, ...rest }) => rest);

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
              <BreadcrumbPage>Accounts</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-4">
        <div>
          <h1 className="text-lg font-semibold">Bank Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Accounts are required when adding transactions.
          </p>
        </div>
        <AccountsTable accounts={accounts} />
        <Separator />
        <LinkedAccountsSection
          initialItems={safePlaidItems}
          categories={categories}
          bankAccounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
        />
      </div>
    </>
  );
}

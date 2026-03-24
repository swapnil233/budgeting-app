import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ReportsTabs } from "@/components/reports/reports-tabs";

export default async function ReportsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const userId = session.user.id;

  const [transactions, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: { category: { userId } },
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

  // Serialize dates to strings for client boundary
  const txns = transactions.map((t) => ({
    ...t,
    date: t.date.toISOString(),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <div className="flex-1 p-6 space-y-4 min-h-0">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          All-time analysis · {transactions.length} transactions
        </p>
      </div>
      <ReportsTabs transactions={txns} categories={categories} />
    </div>
  );
}

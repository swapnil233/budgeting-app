import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const [categories, spendByCategory, inflowTotal] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ group: "asc" }, { name: "asc" }] }),
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
    const status =
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

  return NextResponse.json({ rows, totalInflow, totalExpenses, netPosition });
}

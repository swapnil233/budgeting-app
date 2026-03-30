import prisma from "@/lib/prisma";

interface FetchParams {
  userId: string;
  month: number;
  year: number;
  page: number;
  pageSize: number | "all";
  search?: string;
}

export async function fetchTransactions({
  userId,
  month,
  year,
  page,
  pageSize,
  search,
}: FetchParams) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const baseWhere = {
    category: { userId },
    date: { gte: start, lte: end },
  };

  const where = search
    ? {
        AND: [
          baseWhere,
          {
            OR: [
              { merchant: { contains: search, mode: "insensitive" as const } },
              { notes: { contains: search, mode: "insensitive" as const } },
              {
                category: {
                  name: { contains: search, mode: "insensitive" as const },
                },
              },
            ],
          },
        ],
      }
    : baseWhere;

  const isAll = pageSize === "all";
  const skip = isAll ? undefined : (page - 1) * (pageSize as number);
  const take = isAll ? undefined : (pageSize as number);

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true, bankAccount: true },
      orderBy: { date: "desc" },
      skip,
      take,
    }),
    prisma.transaction.count({ where }),
  ]);

  return { transactions, total };
}

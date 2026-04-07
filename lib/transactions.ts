import prisma from "@/lib/prisma";

export type SortField = "date" | "amount" | "merchant" | "type" | "category" | "account" | "notes";

interface FetchParams {
  userId: string;
  month: number;
  year: number;
  page: number;
  pageSize: number | "all";
  search?: string;
  sortBy?: SortField;
  sortDir?: "asc" | "desc";
}

function buildOrderBy(sortBy: SortField = "date", sortDir: "asc" | "desc" = "desc") {
  switch (sortBy) {
    case "amount":   return { amount: sortDir };
    case "merchant": return { merchant: sortDir };
    case "type":     return { type: sortDir };
    case "notes":    return [{ notes: sortDir }, { date: "desc" as const }];
    case "category": return { category: { name: sortDir } };
    case "account":  return [{ bankAccount: { name: sortDir } }, { date: "desc" as const }];
    default:         return { date: sortDir };
  }
}

export async function fetchTransactions({
  userId,
  month,
  year,
  page,
  pageSize,
  search,
  sortBy = "date",
  sortDir = "desc",
}: FetchParams) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

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
      orderBy: buildOrderBy(sortBy, sortDir),
      skip,
      take,
    }),
    prisma.transaction.count({ where }),
  ]);

  return { transactions, total };
}

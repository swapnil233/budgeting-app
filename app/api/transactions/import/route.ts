import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

interface ImportRow {
  date: string;
  merchant: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  notes: string | null;
  bankAccountId: string | null;
  categoryId: string | null;
  categoryName: string;
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const { rows } = (await req.json()) as { rows: ImportRow[] };

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  // Collect unique new category names (rows without a resolved categoryId)
  const newCatNames = [
    ...new Set(
      rows
        .filter((r) => !r.categoryId)
        .map((r) => r.categoryName.trim())
        .filter(Boolean)
    ),
  ];

  // Upsert new categories (group defaults to OTHER)
  const newCatMap: Record<string, string> = {};
  for (const name of newCatNames) {
    const cat = await prisma.category.upsert({
      where: { name_userId: { name, userId } },
      update: {},
      create: { name, group: "OTHER", userId },
    });
    newCatMap[name.toLowerCase()] = cat.id;
  }

  // Build final transaction records
  const data = rows
    .map((r) => ({
      date: new Date(r.date),
      merchant: r.merchant.trim(),
      amount: r.amount,
      type: r.type,
      notes: r.notes || null,
      review: false,
      bankAccountId: r.bankAccountId || null,
      categoryId: r.categoryId ?? newCatMap[r.categoryName.trim().toLowerCase()],
    }))
    .filter((r) => r.categoryId); // drop any with unresolvable category

  await prisma.transaction.createMany({ data });

  return NextResponse.json({ count: data.length });
}

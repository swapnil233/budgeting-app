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

  try {
    const { rows } = (await req.json()) as { rows: ImportRow[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    // Upsert any new categories first
    const newCatNames = [
      ...new Set(
        rows
          .filter((r) => !r.categoryId)
          .map((r) => r.categoryName.trim())
          .filter(Boolean)
      ),
    ];

    const newCatMap: Record<string, string> = {};
    for (const name of newCatNames) {
      const cat = await prisma.category.upsert({
        where: { name_userId: { name, userId } },
        update: {},
        create: { name, group: "OTHER", userId },
      });
      newCatMap[name.toLowerCase()] = cat.id;
    }

    // Create each transaction individually (same path as POST /api/transactions)
    let count = 0;
    for (const r of rows) {
      const categoryId =
        r.categoryId ?? newCatMap[r.categoryName.trim().toLowerCase()];
      if (!categoryId) continue;

      await prisma.transaction.create({
        data: {
          date: new Date(r.date),
          merchant: r.merchant.trim(),
          amount: r.amount,
          type: r.type,
          notes: r.notes || null,
          review: false,
          bankAccountId: r.bankAccountId || null,
          categoryId,
        },
      });
      count++;
    }

    return NextResponse.json({ count });
  } catch (error) {
    console.error("[/api/transactions/import]", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}

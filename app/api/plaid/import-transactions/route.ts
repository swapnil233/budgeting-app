import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface ImportRow {
  plaidTransactionId: string;
  merchant: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  date: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryGroup: string | null;
  bankAccountId: string | null;
  notes: string | null;
}

/**
 * POST /api/plaid/import-transactions
 *
 * Atomically creates Transaction records from selected Plaid transactions
 * and marks the source PlaidTransactions as imported.
 * Auto-creates new categories when categoryName is provided instead of categoryId.
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { rows: ImportRow[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { rows } = body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "rows is required" }, { status: 400 });
  }

  // Validate that all plaid transactions belong to this user and are not yet imported.
  const plaidTxIds = rows.map((r) => r.plaidTransactionId);
  const plaidTxs = await prisma.plaidTransaction.findMany({
    where: {
      id: { in: plaidTxIds },
      plaidItem: { userId: session.user.id },
      importedAt: null,
    },
    select: { id: true },
  });
  const validIds = new Set(plaidTxs.map((t) => t.id));
  const invalidIds = plaidTxIds.filter((id) => !validIds.has(id));
  if (invalidIds.length > 0) {
    return NextResponse.json(
      { error: `Invalid or already-imported plaid transaction IDs: ${invalidIds.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate existing categoryIds belong to this user.
  const existingCategoryIds = [...new Set(rows.filter((r) => r.categoryId).map((r) => r.categoryId!))];
  if (existingCategoryIds.length > 0) {
    const categories = await prisma.category.findMany({
      where: { id: { in: existingCategoryIds }, userId: session.user.id },
      select: { id: true },
    });
    const validCategoryIds = new Set(categories.map((c) => c.id));
    const invalidCategories = existingCategoryIds.filter((id) => !validCategoryIds.has(id));
    if (invalidCategories.length > 0) {
      return NextResponse.json(
        { error: `Invalid category IDs: ${invalidCategories.join(", ")}` },
        { status: 400 }
      );
    }
  }

  try {
    const count = await prisma.$transaction(async (tx) => {
      // Auto-create new categories (upsert by name so duplicates are safe).
      const newCategoryRows = rows.filter((r) => !r.categoryId && r.categoryName);
      const uniqueNewCategories = new Map<string, string>(); // name -> group
      for (const row of newCategoryRows) {
        if (!uniqueNewCategories.has(row.categoryName!)) {
          uniqueNewCategories.set(row.categoryName!, row.categoryGroup ?? "OTHER");
        }
      }

      const categoryNameToId = new Map<string, string>();
      for (const [name, group] of uniqueNewCategories) {
        const cat = await tx.category.upsert({
          where: {
            name_userId: { name, userId: session.user.id },
          },
          create: {
            name,
            group: group as "INCOME" | "FIXED" | "SUBSCRIPTIONS" | "FOOD" | "LIFESTYLE" | "PEOPLE_AND_PETS" | "OTHER",
            userId: session.user.id,
          },
          update: {},
        });
        categoryNameToId.set(name, cat.id);
      }

      // Create transactions and mark Plaid records as imported.
      let created = 0;
      for (const row of rows) {
        const resolvedCategoryId = row.categoryId ?? categoryNameToId.get(row.categoryName!);
        if (!resolvedCategoryId) continue;

        const transaction = await tx.transaction.create({
          data: {
            type: row.type,
            merchant: row.merchant,
            amount: row.amount,
            date: new Date(row.date),
            notes: row.notes,
            review: true,
            categoryId: resolvedCategoryId,
            bankAccountId: row.bankAccountId,
          },
        });

        await tx.plaidTransaction.update({
          where: { id: row.plaidTransactionId },
          data: {
            importedAt: new Date(),
            importedTransactionId: transaction.id,
          },
        });

        created++;
      }
      return created;
    });

    return NextResponse.json({ count });
  } catch (err) {
    console.error("[plaid] import-transactions error:", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}

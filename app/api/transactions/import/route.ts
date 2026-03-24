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

    console.log("[import] rows received:", rows.length);
    console.log("[import] sample row[0]:", JSON.stringify(rows[0]));

    // Collect unique category names that need to be created
    const newCatNames = [
      ...new Set(
        rows
          .filter((r) => !r.categoryId)
          .map((r) => r.categoryName.trim())
          .filter(Boolean)
      ),
    ];
    console.log("[import] new category names:", newCatNames);

    // Upsert new categories (group defaults to OTHER)
    const newCatMap: Record<string, string> = {};
    for (const name of newCatNames) {
      const cat = await prisma.category.upsert({
        where: { name_userId: { name, userId } },
        update: {},
        create: { name, group: "OTHER", userId },
      });
      newCatMap[name.toLowerCase()] = cat.id;
      console.log("[import] upserted category:", name, "→", cat.id);
    }

    // Create each transaction individually
    let count = 0;
    for (const r of rows) {
      const categoryId =
        r.categoryId ?? newCatMap[r.categoryName.trim().toLowerCase()];

      if (!categoryId) {
        console.warn("[import] skipping row — no categoryId resolved:", r.categoryName, r.categoryId);
        continue;
      }

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

    console.log("[import] done. created:", count, "of", rows.length);
    return NextResponse.json({ count });
  } catch (error) {
    console.error("[/api/transactions/import]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { syncTransactionsForItem } from "@/lib/plaid/sync";
import prisma from "@/lib/prisma";

/**
 * POST /api/plaid/refresh-transactions
 * Body (optional): { itemId: string }  — omit to refresh all items for the user.
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let targetItemId: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.itemId && typeof body.itemId === "string") {
      targetItemId = body.itemId;
    }
  } catch {
    // no body is fine
  }

  try {
    let items;
    if (targetItemId) {
      const item = await prisma.plaidItem.findFirst({
        where: { id: targetItemId, userId: session.user.id },
      });
      if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
      items = [item];
    } else {
      items = await prisma.plaidItem.findMany({
        where: { userId: session.user.id },
      });
    }

    const results = await Promise.all(
      items.map(async (item) => {
        const result = await syncTransactionsForItem(item.id);
        return { itemId: item.id, institutionName: item.institutionName, ...result };
      })
    );

    return NextResponse.json({ synced: results });
  } catch (err) {
    console.error("[plaid] refresh-transactions error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

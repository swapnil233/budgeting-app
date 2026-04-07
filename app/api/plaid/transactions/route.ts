import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/plaid/transactions
 *
 * Returns un-imported, non-pending Plaid transactions for the current user.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const transactions = await prisma.plaidTransaction.findMany({
    where: {
      plaidItem: { userId: session.user.id },
      importedAt: null,
      pending: false,
    },
    include: {
      plaidAccount: { select: { name: true, mask: true, type: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ transactions, count: transactions.length });
}

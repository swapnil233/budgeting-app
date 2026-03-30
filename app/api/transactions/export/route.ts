import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

function escapeCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const transactions = await prisma.transaction.findMany({
    where: { category: { userId: session.user.id } },
    include: { category: true, bankAccount: true },
    orderBy: { date: "asc" },
  });

  const header = ["Date", "Type", "Merchant", "Amount", "Category", "Bank Account", "Notes", "Review"].join(",");

  const rows = transactions.map((t) => {
    const date = t.date.toISOString().split("T")[0];
    const amount = (t.amount / 100).toFixed(2);
    return [
      escapeCell(date),
      escapeCell(t.type),
      escapeCell(t.merchant),
      escapeCell(amount),
      escapeCell(t.category.name),
      escapeCell(t.bankAccount?.name ?? ""),
      escapeCell(t.notes ?? ""),
      escapeCell(t.review ? "Yes" : "No"),
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="transactions.csv"',
    },
  });
}

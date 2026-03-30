import { auth } from "@/lib/auth";
import { fetchTransactions } from "@/lib/transactions";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSizeRaw = searchParams.get("pageSize") ?? "20";
  const pageSize = pageSizeRaw === "all" ? "all" as const : Math.max(1, parseInt(pageSizeRaw));
  const search = searchParams.get("search") ?? "";

  const { transactions, total } = await fetchTransactions({
    userId: session.user.id,
    month,
    year,
    page,
    pageSize,
    search: search || undefined,
  });

  return NextResponse.json({ transactions, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const transaction = await prisma.transaction.create({
    data: {
      type: body.type,
      merchant: body.merchant,
      amount: body.amount,
      notes: body.notes ?? null,
      review: body.review ?? false,
      date: new Date(body.date),
      categoryId: body.categoryId,
      bankAccountId: body.bankAccountId,
    },
    include: { category: true, bankAccount: true },
  });

  return NextResponse.json(transaction, { status: 201 });
}

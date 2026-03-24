import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const transactions = await prisma.transaction.findMany({
    where: { bankAccount: { userId: session.user.id }, date: { gte: start, lte: end } },
    include: { category: true, bankAccount: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(transactions);
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

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const transaction = await prisma.transaction.update({
    where: { id },
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

  return NextResponse.json(transaction);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.transaction.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

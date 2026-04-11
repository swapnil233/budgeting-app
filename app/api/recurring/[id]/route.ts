import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const FREQUENCIES = ["MONTHLY", "WEEKLY", "BI_WEEKLY", "YEARLY"] as const;
type Frequency = (typeof FREQUENCIES)[number];

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  const name = typeof b.name === "string" ? b.name.trim() : "";
  const amount = typeof b.amount === "number" ? b.amount : NaN;
  const categoryId = typeof b.categoryId === "string" ? b.categoryId : "";
  const frequency = FREQUENCIES.includes(b.frequency as Frequency)
    ? (b.frequency as Frequency)
    : null;
  const startDate = typeof b.startDate === "string" ? new Date(b.startDate) : null;

  if (!name || !categoryId || !frequency || !startDate || isNaN(startDate.getTime())) return null;
  if (!Number.isFinite(amount) || amount < 0) return null;

  // dayOfMonth: 0 = "last day of month" sentinel; 1–31 = specific day.
  const dayOfMonth =
    typeof b.dayOfMonth === "number" && b.dayOfMonth >= 0 && b.dayOfMonth <= 31
      ? Math.round(b.dayOfMonth)
      : frequency === "MONTHLY"
        ? startDate.getDate()
        : null;

  const endDate =
    typeof b.endDate === "string" && b.endDate.length > 0 ? new Date(b.endDate) : null;
  if (endDate && isNaN(endDate.getTime())) return null;

  const bankAccountId =
    typeof b.bankAccountId === "string" && b.bankAccountId.length > 0 ? b.bankAccountId : null;

  const notes = typeof b.notes === "string" ? b.notes : null;

  const active = typeof b.active === "boolean" ? b.active : true;

  return {
    name,
    amount: Math.round(amount),
    categoryId,
    frequency,
    dayOfMonth,
    startDate,
    endDate,
    bankAccountId,
    notes,
    active,
  };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = parseBody(body);
  if (!parsed) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const existing = await prisma.recurringExpense.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cat = await prisma.category.findFirst({
    where: { id: parsed.categoryId, userId: session.user.id },
    select: { id: true },
  });
  if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  if (parsed.bankAccountId) {
    const ba = await prisma.bankAccount.findFirst({
      where: { id: parsed.bankAccountId, userId: session.user.id },
      select: { id: true },
    });
    if (!ba) return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
  }

  const updated = await prisma.recurringExpense.update({
    where: { id },
    data: parsed,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.recurringExpense.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.recurringExpense.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

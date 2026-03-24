import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.category.findMany({
    where: { userId: session.user.id },
    orderBy: [{ group: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const category = await prisma.category.create({
    data: {
      name: body.name,
      group: body.group,
      budgetAmount: body.budgetAmount ?? 0,
      userId: session.user.id,
    },
  });

  return NextResponse.json(category, { status: 201 });
}

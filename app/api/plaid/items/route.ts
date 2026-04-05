import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.plaidItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: {
      plaidAccounts: {
        orderBy: { name: "asc" },
      },
    },
  });

  // Don't expose the encrypted access token to the client.
  const safe = items.map(({ accessTokenEncrypted: _, ...rest }) => rest);

  return NextResponse.json(safe);
}

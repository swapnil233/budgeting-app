import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getPlaidClient } from "@/lib/plaid/client";
import { encrypt } from "@/lib/plaid/encrypt";
import { syncTransactionsForItem } from "@/lib/plaid/sync";
import prisma from "@/lib/prisma";

interface ExchangeBody {
  public_token: string;
  metadata?: {
    institution?: { institution_id?: string; name?: string };
  };
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: ExchangeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { public_token, metadata } = body;
  if (!public_token || typeof public_token !== "string") {
    return NextResponse.json({ error: "public_token is required" }, { status: 400 });
  }

  try {
    const plaid = getPlaidClient();
    const { data } = await plaid.itemPublicTokenExchange({ public_token });

    const accessTokenEncrypted = encrypt(data.access_token);

    const plaidItem = await prisma.plaidItem.upsert({
      where: { itemId: data.item_id },
      create: {
        userId: session.user.id,
        itemId: data.item_id,
        accessTokenEncrypted,
        institutionId: metadata?.institution?.institution_id ?? null,
        institutionName: metadata?.institution?.name ?? null,
      },
      update: {
        accessTokenEncrypted,
        institutionId: metadata?.institution?.institution_id ?? null,
        institutionName: metadata?.institution?.name ?? null,
      },
    });

    // Initial sync — runs inline; for large histories this may take a few seconds.
    const syncResult = await syncTransactionsForItem(plaidItem.id);

    return NextResponse.json({
      success: true,
      itemId: plaidItem.id,
      sync: syncResult,
    });
  } catch (err) {
    console.error("[plaid] exchange-public-token error:", err);
    return NextResponse.json({ error: "Failed to connect bank account" }, { status: 500 });
  }
}

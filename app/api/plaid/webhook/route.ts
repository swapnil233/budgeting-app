import { NextRequest, NextResponse } from "next/server";
import { syncTransactionsForItem } from "@/lib/plaid/sync";
import { verifyPlaidWebhook } from "@/lib/plaid/verify-webhook";
import prisma from "@/lib/prisma";

// Plaid webhook body shapes we care about.
interface PlaidWebhook {
  webhook_type: string;
  webhook_code: string;
  item_id: string;
  error?: {
    error_type: string;
    error_code: string;
    error_message: string;
  };
}

/**
 * POST /api/plaid/webhook
 *
 * Plaid sends webhooks here when data changes. Point PLAID_WEBHOOK_URL at this
 * endpoint in your Plaid dashboard (or .env for sandbox testing via a tunnel).
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verify webhook signature in non-sandbox environments.
  const plaidEnv = process.env.PLAID_ENV ?? "sandbox";
  if (plaidEnv !== "sandbox") {
    const verificationHeader = req.headers.get("plaid-verification");
    if (!verificationHeader) {
      return NextResponse.json({ error: "Missing verification header" }, { status: 401 });
    }
    const isValid = await verifyPlaidWebhook(rawBody, verificationHeader);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }
  }

  let body: PlaidWebhook;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { webhook_type, webhook_code, item_id, error } = body;

  // Handle ITEM errors (e.g. access revoked, re-auth needed).
  if (webhook_type === "ITEM") {
    if (webhook_code === "ERROR" && error) {
      console.warn(`[plaid webhook] ITEM ERROR for item ${item_id}:`, error.error_code, error.error_message);
    }
    return NextResponse.json({ received: true });
  }

  // Only act on TRANSACTIONS › SYNC_UPDATES_AVAILABLE.
  if (webhook_type !== "TRANSACTIONS" || webhook_code !== "SYNC_UPDATES_AVAILABLE") {
    return NextResponse.json({ received: true });
  }

  const plaidItem = await prisma.plaidItem.findUnique({ where: { itemId: item_id } });
  if (!plaidItem) {
    // Unknown item — return 200 so Plaid doesn't retry.
    console.warn(`[plaid webhook] received webhook for unknown item_id: ${item_id}`);
    return NextResponse.json({ received: true });
  }

  try {
    const result = await syncTransactionsForItem(plaidItem.id);
    console.log(`[plaid webhook] synced item ${item_id}:`, result);
  } catch (err) {
    console.error(`[plaid webhook] sync failed for item ${item_id}:`, err);
    // Return 500 so Plaid retries.
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

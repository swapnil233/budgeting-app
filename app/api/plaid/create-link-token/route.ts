import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getPlaidClient, getPlaidProducts, getPlaidCountryCodes } from "@/lib/plaid/client";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const plaid = getPlaidClient();

    const request: Parameters<typeof plaid.linkTokenCreate>[0] = {
      client_name: "Leto Budget",
      language: "en",
      country_codes: getPlaidCountryCodes(),
      products: getPlaidProducts(),
      user: { client_user_id: session.user.id },
      transactions: { days_requested: 180 },
    };

    if (process.env.PLAID_WEBHOOK_URL) {
      request.webhook = process.env.PLAID_WEBHOOK_URL;
    }
    if (process.env.PLAID_REDIRECT_URI) {
      request.redirect_uri = process.env.PLAID_REDIRECT_URI;
    }

    const { data } = await plaid.linkTokenCreate(request);
    return NextResponse.json({ link_token: data.link_token });
  } catch (err) {
    console.error("[plaid] create-link-token error:", err);
    return NextResponse.json({ error: "Failed to create link token" }, { status: 500 });
  }
}

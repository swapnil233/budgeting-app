# Plaid Integration

## Overview

Plaid is used to connect Canadian bank accounts and automatically sync transactions. The flow is:

1. App creates a **link token** (server-side) and opens **Plaid Link** in the browser.
2. User authenticates with their bank inside Plaid Link.
3. Plaid issues a `public_token`; the app exchanges it for a persistent `access_token` (stored encrypted).
4. The app performs an **initial transactions sync** (180 days of history) immediately after linking.
5. Plaid sends **webhooks** whenever new transactions are available; the app re-runs sync automatically.

## Required Environment Variables

Add these to your `.env`:

```bash
# Plaid credentials — get these from https://dashboard.plaid.com
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_sandbox_secret       # Use the Sandbox secret for local dev

# Environment: sandbox | development | production
PLAID_ENV=sandbox

# Comma-separated Plaid products to request
PLAID_PRODUCTS=transactions

# Comma-separated ISO country codes (CA = Canada)
PLAID_COUNTRY_CODES=CA

# Encryption key for storing access tokens: exactly 64 hex chars (32 random bytes)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
PLAID_ENCRYPTION_KEY=your_64_hex_char_key

# Where Plaid should POST webhooks (must be publicly reachable)
PLAID_WEBHOOK_URL=https://your-tunnel.ngrok.io/api/plaid/webhook

# Optional: OAuth redirect URI (only needed for OAuth-based institutions)
# PLAID_REDIRECT_URI=http://localhost:3000/api/plaid/oauth-return
```

## Generating a PLAID_ENCRYPTION_KEY

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the output as `PLAID_ENCRYPTION_KEY` in `.env`. Keep this secret — losing it means you cannot decrypt stored access tokens.

## Plaid Dashboard Setup

1. Sign up at https://dashboard.plaid.com and create an application.
2. Copy **Client ID** and **Sandbox Secret** into `.env`.
3. Under **API** → **Allowed redirect URIs**, add your redirect URI if using OAuth institutions.
4. Under **Webhooks**, set the endpoint to your `PLAID_WEBHOOK_URL`.
5. For production, go through Plaid's approval process to move from Sandbox → Development → Production.

## Testing Locally (Sandbox)

Plaid Sandbox uses fake institutions with test credentials:

| Institution | Username | Password |
|---|---|---|
| Plaid Bank | `user_good` | `pass_good` |

1. Start the dev server: `npm run dev`
2. Navigate to **Accounts** in the dashboard.
3. Click **Connect your bank** — Plaid Link opens in a modal.
4. Select a Sandbox institution and use the test credentials above.
5. After linking, the app fetches 180 days of synthetic transactions.

## Testing Webhooks Locally

Plaid can't reach `localhost`, so use a tunnel:

```bash
# ngrok (free tier works fine)
ngrok http 3000
# Copy the https URL and set:
# PLAID_WEBHOOK_URL=https://abc123.ngrok.io/api/plaid/webhook
```

You can also trigger a sandbox webhook manually from the Plaid dashboard or via the Plaid API.

## How the Sync Works

- **Initial sync**: runs inline when you exchange the public token. Fetches up to 180 days.
- **Incremental sync**: triggered by `TRANSACTIONS › SYNC_UPDATES_AVAILABLE` webhooks. Uses a cursor stored per `PlaidItem` so only new/changed data is fetched.
- **Manual refresh**: `POST /api/plaid/refresh-transactions` with optional `{ itemId }` body. Omit `itemId` to refresh all linked items.
- All writes are **idempotent upserts** on `plaidTransactionId`; running sync twice is safe.

## Database Schema

Three new tables are created by the migration:

| Table | Purpose |
|---|---|
| `plaid_item` | One row per linked bank (holds encrypted access token + cursor) |
| `plaid_account` | One row per account within an item (balances, masks) |
| `plaid_transaction` | Raw Plaid transactions; `rawJson` preserves the full API payload |

Plaid transactions are stored separately from the app's own `transaction` table. They are a **read-only ingestion layer** — the `rawJson` column keeps the full Plaid payload for future use.

## Migration Steps

The migration runs automatically via `prisma migrate dev`. If you need to apply it manually (e.g. in production):

```bash
npx prisma migrate deploy
```

## Key Files

| File | Purpose |
|---|---|
| `lib/plaid/client.ts` | Lazy-initialized Plaid API client |
| `lib/plaid/encrypt.ts` | AES-256-GCM encrypt/decrypt for access tokens |
| `lib/plaid/sync.ts` | Reusable `syncTransactionsForItem()` function |
| `app/api/plaid/create-link-token/route.ts` | Creates Plaid Link token |
| `app/api/plaid/exchange-public-token/route.ts` | Exchanges token, stores item, runs initial sync |
| `app/api/plaid/refresh-transactions/route.ts` | Manual sync trigger |
| `app/api/plaid/webhook/route.ts` | Plaid webhook receiver |
| `app/api/plaid/items/route.ts` | Returns linked items + accounts for the UI |
| `components/plaid/ConnectBankButton.tsx` | "Connect your bank" button (client component) |
| `components/plaid/LinkedAccountsSection.tsx` | Connected accounts UI with sync button |

## Known TODOs / Limitations

- **Webhook signature verification** is not implemented. For production, add JWT verification using `Plaid-Verification` header. See [Plaid docs](https://plaid.com/docs/api/webhooks/webhook-verification/).
- Plaid transactions are stored in `plaid_transaction` but **not yet mapped** into the app's main `transaction` table. A future step would add a "review & categorize" UI to import selected Plaid transactions into your budget.
- OAuth redirect URI support (`PLAID_REDIRECT_URI`) is wired into the link token but there is no `/api/plaid/oauth-return` route yet — only needed for institutions that use bank-hosted OAuth (uncommon in Canada sandbox).

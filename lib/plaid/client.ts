import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";

type PlaidEnv = keyof typeof PlaidEnvironments;

let _client: PlaidApi | null = null;

export function getPlaidClient(): PlaidApi {
  if (_client) return _client;

  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId) throw new Error("PLAID_CLIENT_ID is not set");
  if (!secret) throw new Error("PLAID_SECRET is not set");

  const env = (process.env.PLAID_ENV ?? "sandbox") as PlaidEnv;
  if (!PlaidEnvironments[env]) {
    throw new Error(`Invalid PLAID_ENV "${env}". Must be sandbox, development, or production.`);
  }

  const config = new Configuration({
    basePath: PlaidEnvironments[env],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });

  _client = new PlaidApi(config);
  return _client;
}

export function getPlaidProducts(): Products[] {
  return (process.env.PLAID_PRODUCTS ?? "transactions")
    .split(",")
    .map((p) => p.trim() as Products);
}

export function getPlaidCountryCodes(): CountryCode[] {
  return (process.env.PLAID_COUNTRY_CODES ?? "CA")
    .split(",")
    .map((c) => c.trim() as CountryCode);
}

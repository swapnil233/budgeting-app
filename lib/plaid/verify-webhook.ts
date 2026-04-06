import { createHash } from "crypto";
import { importJWK, jwtVerify, decodeProtectedHeader } from "jose";
import { getPlaidClient } from "./client";

// Cache JWKs by kid to avoid repeated lookups.
const keyCache = new Map<string, CryptoKey>();

/**
 * Verify a Plaid webhook request.
 *
 * 1. Decode the JWT header from `Plaid-Verification` to get the `kid`.
 * 2. Fetch the public key from Plaid's `/webhook_verification_key/get`.
 * 3. Verify the JWT signature (ES256).
 * 4. Compare the JWT's `request_body_sha256` claim against a SHA-256 of the raw body.
 *
 * Returns true if valid, false otherwise.
 * See: https://plaid.com/docs/api/webhooks/webhook-verification/
 */
export async function verifyPlaidWebhook(
  rawBody: string,
  plaidVerificationHeader: string
): Promise<boolean> {
  try {
    const { kid } = decodeProtectedHeader(plaidVerificationHeader);
    if (!kid) return false;

    let key = keyCache.get(kid);
    if (!key) {
      const client = getPlaidClient();
      const response = await client.webhookVerificationKeyGet({
        key_id: kid,
      });
      const jwk = response.data.key;
      key = (await importJWK(jwk, "ES256")) as CryptoKey;
      keyCache.set(kid, key);
    }

    const { payload } = await jwtVerify(plaidVerificationHeader, key, {
      algorithms: ["ES256"],
      maxTokenAge: "5 min",
    });

    const claimedHash = payload.request_body_sha256 as string | undefined;
    if (!claimedHash) return false;

    const actualHash = createHash("sha256").update(rawBody).digest("hex");
    return claimedHash === actualHash;
  } catch (err) {
    console.error("[plaid webhook] verification failed:", err);
    return false;
  }
}

"use client";

import { useState, useCallback, useEffect } from "react";
import { usePlaidLink, type PlaidLinkOnSuccess } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface Props {
  onSuccess?: () => void;
}

export function ConnectBankButton({ onSuccess }: Props) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [fetchingToken, setFetchingToken] = useState(true);
  const [exchanging, setExchanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/plaid/create-link-token", { method: "POST" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to create link token");
        return r.json();
      })
      .then((d) => setLinkToken(d.link_token))
      .catch(() => setError("Could not initialize bank connection. Check your Plaid credentials."))
      .finally(() => setFetchingToken(false));
  }, []);

  const handleSuccess = useCallback<PlaidLinkOnSuccess>(
    async (publicToken, metadata) => {
      setExchanging(true);
      setError(null);
      try {
        const res = await fetch("/api/plaid/exchange-public-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_token: publicToken, metadata }),
        });
        if (!res.ok) throw new Error("Exchange failed");
        onSuccess?.();
      } catch {
        setError("Failed to connect bank account. Please try again.");
      } finally {
        setExchanging(false);
      }
    },
    [onSuccess]
  );

  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess: handleSuccess });

  const busy = fetchingToken || exchanging;

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button
        onClick={() => open()}
        disabled={busy || !ready}
      >
        {busy && <Spinner className="mr-2" />}
        Connect your bank
      </Button>
    </div>
  );
}

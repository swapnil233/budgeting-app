"use client";

import { useState, useCallback } from "react";
import { ConnectBankButton } from "@/components/plaid/ConnectBankButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { RefreshCwIcon, BuildingIcon } from "lucide-react";

interface PlaidAccountData {
  id: string;
  name: string;
  mask: string | null;
  type: string;
  subtype: string | null;
  currentBalance: number | null;
  currencyCode: string | null;
}

interface PlaidItemData {
  id: string;
  itemId: string;
  institutionName: string | null;
  updatedAt: Date | string;
  plaidAccounts: PlaidAccountData[];
}

interface Props {
  initialItems: PlaidItemData[];
}

export function LinkedAccountsSection({ initialItems }: Props) {
  const [items, setItems] = useState<PlaidItemData[]>(initialItems);
  const [syncing, setSyncing] = useState<string | null>(null); // itemId being synced
  const [syncError, setSyncError] = useState<string | null>(null);

  const refreshItems = useCallback(async () => {
    const res = await fetch("/api/plaid/items");
    if (res.ok) setItems(await res.json());
  }, []);

  const handleSync = useCallback(
    async (itemId: string) => {
      setSyncing(itemId);
      setSyncError(null);
      try {
        const res = await fetch("/api/plaid/refresh-transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId }),
        });
        if (!res.ok) throw new Error("Sync failed");
        await refreshItems();
      } catch {
        setSyncError("Sync failed. Please try again.");
      } finally {
        setSyncing(null);
      }
    },
    [refreshItems]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Connected via Plaid</h2>
          <p className="text-sm text-muted-foreground">
            Transactions are synced automatically via webhooks.
          </p>
        </div>
        <ConnectBankButton onSuccess={refreshItems} />
      </div>

      {syncError && (
        <p className="text-sm text-destructive">{syncError}</p>
      )}

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
          No banks connected yet. Click &ldquo;Connect your bank&rdquo; to get started.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id} className="py-4">
              <CardHeader className="pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <BuildingIcon className="size-4 shrink-0 text-muted-foreground" />
                    <CardTitle className="text-sm truncate">
                      {item.institutionName ?? "Unknown Institution"}
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    disabled={syncing === item.id}
                    onClick={() => handleSync(item.id)}
                    title="Sync now"
                  >
                    {syncing === item.id ? (
                      <Spinner className="size-3.5" />
                    ) : (
                      <RefreshCwIcon className="size-3.5" />
                    )}
                  </Button>
                </div>
                <CardDescription className="text-xs">
                  Last synced {new Date(item.updatedAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-3">
                {item.plaidAccounts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No accounts found.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {item.plaidAccounts.map((account) => (
                      <li key={account.id} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">
                          {account.name}
                          {account.mask && (
                            <span className="ml-1 text-muted-foreground">••{account.mask}</span>
                          )}
                        </span>
                        {account.currentBalance != null && (
                          <span className="tabular-nums text-muted-foreground">
                            {new Intl.NumberFormat("en-CA", {
                              style: "currency",
                              currency: account.currencyCode ?? "CAD",
                              currencyDisplay: "narrowSymbol",
                            }).format(account.currentBalance)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

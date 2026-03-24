"use client";

import { Button } from "@/components/ui/button";
import { IconCheck, IconTrash, IconX } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type BankAccount = {
  id: string;
  name: string;
  type: string;
  provider: string;
};

const PROVIDERS = [
  { value: "TD_BANK", label: "TD Bank" },
  { value: "AMEX", label: "Amex" },
  { value: "SCOTIA_BANK", label: "Scotiabank" },
  { value: "WEALTH_SIMPLE", label: "Wealthsimple" },
  { value: "RBC", label: "RBC" },
  { value: "BMO", label: "BMO" },
];

const TYPES = [
  { value: "CHECKING", label: "Chequing" },
  { value: "SAVINGS", label: "Savings" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "CASH", label: "Cash" },
];

const PROVIDER_LABELS = Object.fromEntries(PROVIDERS.map((p) => [p.value, p.label]));
const TYPE_LABELS = Object.fromEntries(TYPES.map((t) => [t.value, t.label]));

const cellInput =
  "w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm outline-none focus:border-ring focus:bg-background focus:ring-1 focus:ring-ring transition-colors placeholder:text-muted-foreground/50";
const cellSelect =
  "w-full rounded border border-transparent bg-transparent px-1 py-1 text-sm outline-none focus:border-ring focus:bg-background focus:ring-1 focus:ring-ring transition-colors cursor-pointer";

function AddRow() {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("TD_BANK");
  const [type, setType] = useState("CHECKING");

  function reset() {
    setName("");
    setProvider("TD_BANK");
    setType("CHECKING");
    setError(null);
  }

  async function save() {
    if (!name.trim()) {
      setError("Name is required.");
      nameRef.current?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), provider, type }),
      });
      if (!res.ok) throw new Error("Failed");
      reset();
      nameRef.current?.focus();
      router.refresh();
    } catch {
      setError("Failed to save account.");
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); save(); }
    if (e.key === "Escape") reset();
  }

  return (
    <>
      <tr className="border-b bg-muted/30 hover:bg-muted/40" onKeyDown={handleKeyDown}>
        <td className="px-2 py-1.5">
          <input
            ref={nameRef}
            type="text"
            className={cellInput}
            placeholder="Account name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </td>
        <td className="px-2 py-1.5">
          <select className={cellSelect} value={provider} onChange={(e) => setProvider(e.target.value)}>
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </td>
        <td className="px-2 py-1.5">
          <select className={cellSelect} value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </td>
        <td className="px-2 py-1.5">
          <div className="flex items-center gap-1">
            <Button
              size="icon" variant="ghost"
              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={save} disabled={saving} title="Save (Enter)"
            >
              <IconCheck className="size-4" />
            </Button>
            <Button
              size="icon" variant="ghost"
              className="h-7 w-7 text-muted-foreground"
              onClick={reset} title="Clear (Esc)"
            >
              <IconX className="size-4" />
            </Button>
          </div>
        </td>
      </tr>
      {error && (
        <tr className="bg-destructive/5">
          <td colSpan={4} className="px-3 py-1 text-xs text-destructive">{error}</td>
        </tr>
      )}
    </>
  );
}

export function AccountsTable({ accounts }: { accounts: BankAccount[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this account? Transactions linked to it will also be deleted.")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/bank-accounts/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left">
            <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Name</th>
            <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Provider</th>
            <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Type</th>
            <th className="px-3 py-2.5 w-20" />
          </tr>
        </thead>
        <tbody>
          <AddRow />
          {accounts.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
                No accounts yet. Add one above.
              </td>
            </tr>
          ) : (
            accounts.map((account) => (
              <tr key={account.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-3 py-2.5 font-medium">{account.name}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{PROVIDER_LABELS[account.provider] ?? account.provider}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{TYPE_LABELS[account.type] ?? account.type}</td>
                <td className="px-3 py-2.5">
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(account.id)}
                    disabled={deletingId === account.id}
                  >
                    <IconTrash className="size-3.5" />
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {accounts.length > 0 && (
        <div className="border-t px-3 py-2 text-xs text-muted-foreground bg-muted/20">
          {accounts.length} account{accounts.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

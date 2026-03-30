"use client";

import { Button } from "@/components/ui/button";
import { useAgGridTheme, addRowInput, addRowSelect } from "@/lib/ag-grid";
import { cn } from "@/lib/utils";
import { IconBuildingBank, IconCheck, IconTrash, IconX } from "@tabler/icons-react";
import { type ColDef, type ICellRendererParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

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

type AccountGridContext = {
  onDelete: (id: string) => void;
  onSaved: () => void;
};

// ── Pinned add-row renderer ───────────────────────────────────────────────────

function AddRowCellRenderer({ context }: ICellRendererParams) {
  const { onSaved } = context as AccountGridContext;
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
    nameRef.current?.focus();
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
      onSaved();
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
    <div className="flex h-full w-full items-center gap-1.5 px-2" onKeyDown={handleKeyDown}>
      <input
        ref={nameRef}
        type="text"
        className={cn(addRowInput, "min-w-0 flex-[2]")}
        placeholder="Account name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <select
        className={cn(addRowSelect, "flex-1 shrink-0")}
        value={provider}
        onChange={(e) => setProvider(e.target.value)}
      >
        {PROVIDERS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
      <select
        className={cn(addRowSelect, "flex-1 shrink-0")}
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <div className="flex shrink-0 items-center gap-0.5">
        {error && <span className="text-xs text-destructive mr-1">{error}</span>}
        <Button
          size="icon" variant="ghost"
          className="h-7 w-7 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950"
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
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function AccountsTable({ accounts }: { accounts: BankAccount[] }) {
  const router = useRouter();
  const theme = useAgGridTheme();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this account? Transactions linked to it will also be deleted.")) return;
      setDeletingId(id);
      try {
        await fetch(`/api/bank-accounts/${id}`, { method: "DELETE" });
        router.refresh();
      } finally {
        setDeletingId(null);
      }
    },
    [router],
  );

  const context: AccountGridContext = useMemo(
    () => ({
      onDelete: handleDelete,
      onSaved: () => router.refresh(),
    }),
    [handleDelete, router],
  );

  const ActionCell = useCallback(
    ({ data }: ICellRendererParams<BankAccount>) => {
      if (!data) return null;
      return (
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => handleDelete(data.id)}
        >
          <IconTrash className="size-3.5" />
        </Button>
      );
    },
    [handleDelete],
  );

  const colDefs: ColDef<BankAccount>[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Name",
        flex: 2,
        minWidth: 140,
        cellRenderer: ({ value }: ICellRendererParams) => (
          <span className="font-medium">{value}</span>
        ),
      },
      {
        field: "provider",
        headerName: "Provider",
        flex: 1,
        minWidth: 120,
        valueFormatter: ({ value }) => PROVIDER_LABELS[value] ?? value,
      },
      {
        field: "type",
        headerName: "Type",
        flex: 1,
        minWidth: 120,
        valueFormatter: ({ value }) => TYPE_LABELS[value] ?? value,
      },
      {
        headerName: "",
        width: 70,
        sortable: false,
        resizable: false,
        cellRenderer: ActionCell,
      },
    ],
    [ActionCell],
  );

  return (
    <div className="flex flex-col">
      <div className="rounded-lg border overflow-hidden">
        <AgGridReact<BankAccount>
          theme={theme}
          rowData={accounts}
          columnDefs={colDefs}
          context={context}
          domLayout="autoHeight"
          defaultColDef={{ sortable: true, resizable: true }}
          pinnedTopRowData={[{}]}
          isFullWidthRow={(params) => params.rowNode.rowPinned === "top"}
          fullWidthCellRenderer={AddRowCellRenderer}
          getRowHeight={(params) => (params.node.rowPinned === "top" ? 48 : 40)}
          noRowsOverlayComponent={() => (
            <div className="flex flex-col items-center gap-3 pt-16 pb-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <IconBuildingBank className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No accounts yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Use the row above to add your first account.
                </p>
              </div>
            </div>
          )}
          suppressCellFocus
          suppressMovableColumns
          animateRows
        />
      </div>
      {accounts.length > 0 && (
        <div className="border-x border-b rounded-b-lg px-3 py-2 text-xs text-muted-foreground bg-muted/20">
          {accounts.length} account{accounts.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

"use client";

import { TransactionForm } from "./transaction-form";
import { CsvImportModal } from "./csv-import-modal";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCurrency, dollarsToCents, cn } from "@/lib/utils";
import {
  useAgGridTheme,
  addRowInput,
  addRowSelect,
  GROUP_ORDER,
  GROUP_LABELS,
} from "@/lib/ag-grid";
import {
  IconCheck,
  IconEdit,
  IconReceipt,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { type ColDef, type ICellRendererParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useCallback, useMemo } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = { id: string; name: string; group: string };
type BankAccount = { id: string; name: string };
type Transaction = {
  id: string;
  type: "EXPENSE" | "INCOME";
  merchant: string;
  amount: number;
  notes: string | null;
  review: boolean;
  date: string | Date;
  categoryId: string;
  bankAccountId: string | null;
  category: Category;
  bankAccount: BankAccount | null;
};

type GridContext = {
  categories: Category[];
  bankAccounts: BankAccount[];
  onSaved: () => void;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
};

const inp = addRowInput;
const sel = addRowSelect;

// ── Pinned add-row renderer ───────────────────────────────────────────────────

function AddRowCellRenderer({ context }: ICellRendererParams) {
  const { categories, bankAccounts, onSaved } = context as GridContext;
  const merchantRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [row, setRow] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "EXPENSE" as "EXPENSE" | "INCOME",
    merchant: "",
    amount: "",
    categoryId: categories[0]?.id ?? "",
    bankAccountId: "",
    notes: "",
  });

  function set<K extends keyof typeof row>(key: K, value: (typeof row)[K]) {
    setRow((p) => ({ ...p, [key]: value }));
  }
  function reset() {
    setRow({
      date: new Date().toISOString().split("T")[0],
      type: "EXPENSE",
      merchant: "",
      amount: "",
      categoryId: categories[0]?.id ?? "",
      bankAccountId: "",
      notes: "",
    });
    setError(null);
    merchantRef.current?.focus();
  }

  async function save() {
    if (!row.merchant.trim() || !row.amount || !row.categoryId) {
      setError("Fill in merchant, amount & category.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: row.type,
          merchant: row.merchant.trim(),
          amount: dollarsToCents(row.amount),
          notes: row.notes.trim() || null,
          review: false,
          date: row.date,
          categoryId: row.categoryId,
          bankAccountId: row.bankAccountId || null,
        }),
      });
      if (!res.ok) throw new Error();
      reset();
      onSaved();
    } catch {
      setError("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") reset();
  }

  const byGroup = GROUP_ORDER.reduce<Record<string, Category[]>>((acc, g) => {
    acc[g] = categories.filter((c) => c.group === g);
    return acc;
  }, {});

  return (
    <div
      className="flex h-full w-full items-center gap-1.5 px-2"
      onKeyDown={handleKeyDown}
    >
      {/* Date */}
      <input
        type="date"
        className={cn(inp, "w-[118px] shrink-0")}
        value={row.date}
        onChange={(e) => set("date", e.target.value)}
      />
      {/* Type */}
      <select
        className={cn(sel, "w-[90px] shrink-0")}
        value={row.type}
        onChange={(e) => set("type", e.target.value as "EXPENSE" | "INCOME")}
      >
        <option value="EXPENSE">Expense</option>
        <option value="INCOME">Income</option>
      </select>
      {/* Merchant */}
      <input
        ref={merchantRef}
        type="text"
        className={cn(inp, "min-w-0 flex-[2]")}
        placeholder="Merchant…"
        value={row.merchant}
        onChange={(e) => set("merchant", e.target.value)}
      />
      {/* Amount */}
      <input
        type="number"
        min="0"
        step="0.01"
        className={cn(inp, "w-[88px] shrink-0 text-right")}
        placeholder="0.00"
        value={row.amount}
        onChange={(e) => set("amount", e.target.value)}
      />
      {/* Category */}
      <select
        className={cn(sel, "w-[140px] shrink-0")}
        value={row.categoryId}
        onChange={(e) => set("categoryId", e.target.value)}
      >
        {GROUP_ORDER.map((g) =>
          byGroup[g]?.length ? (
            <optgroup key={g} label={GROUP_LABELS[g]}>
              {byGroup[g].map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ) : null,
        )}
      </select>
      {/* Account */}
      <select
        className={cn(sel, "w-[120px] shrink-0")}
        value={row.bankAccountId}
        onChange={(e) => set("bankAccountId", e.target.value)}
      >
        <option value="">No account</option>
        {bankAccounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      {/* Notes */}
      <input
        type="text"
        className={cn(inp, "flex-1 min-w-0")}
        placeholder="Notes…"
        value={row.notes}
        onChange={(e) => set("notes", e.target.value)}
      />
      {/* Actions */}
      <div className="flex shrink-0 items-center gap-0.5">
        {error && (
          <span className="text-xs text-destructive mr-1">{error}</span>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950"
          onClick={save}
          disabled={saving}
          title="Save (Enter)"
        >
          <IconCheck className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground"
          onClick={reset}
          title="Clear (Esc)"
        >
          <IconX className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Regular cell renderers ────────────────────────────────────────────────────

function TypeBadge({ value }: ICellRendererParams) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-xs font-medium",
        value === "INCOME"
          ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
          : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
      )}
    >
      {value === "INCOME" ? "Income" : "Expense"}
    </span>
  );
}

function AmountCell({ data }: ICellRendererParams<Transaction>) {
  if (!data) return null;
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        data.type === "INCOME"
          ? "text-green-600 dark:text-green-400"
          : "text-red-600 dark:text-red-400",
      )}
    >
      {data.type === "INCOME" ? "+" : "−"}
      {formatCurrency(data.amount)}
    </span>
  );
}

function MerchantCell({ data }: ICellRendererParams<Transaction>) {
  if (!data) return null;
  return (
    <span className="font-medium">
      {data.merchant}
      {data.review && (
        <span className="ml-2 rounded bg-amber-100 px-1 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          Review
        </span>
      )}
    </span>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface TransactionsTableProps {
  transactions: Transaction[];
  categories: Category[];
  bankAccounts: BankAccount[];
}

export function TransactionsTable({
  transactions,
  categories,
  bankAccounts,
}: TransactionsTableProps) {
  const router = useRouter();
  const theme = useAgGridTheme();
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [quickFilter, setQuickFilter] = useState("");

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this transaction?")) return;
      await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      router.refresh();
    },
    [router],
  );

  const context: GridContext = useMemo(
    () => ({
      categories,
      bankAccounts,
      onSaved: () => router.refresh(),
      onEdit: setEditingTransaction,
      onDelete: handleDelete,
    }),
    [categories, bankAccounts, router, handleDelete],
  );

  const ActionCell = useCallback(
    ({ data }: ICellRendererParams<Transaction>) => {
      if (!data) return null;
      return (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setEditingTransaction(data)}
          >
            <IconEdit className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => handleDelete(data.id)}
          >
            <IconTrash className="size-3.5" />
          </Button>
        </div>
      );
    },
    [handleDelete],
  );

  const colDefs: ColDef<Transaction>[] = useMemo(
    () => [
      {
        field: "date",
        headerName: "Date",
        width: 110,
        sort: "desc",
        valueFormatter: ({ value }) =>
          new Date(value).toLocaleDateString("en-CA", {
            month: "short",
            day: "numeric",
          }),
      },
      {
        field: "type",
        headerName: "Type",
        width: 105,
        cellRenderer: TypeBadge,
      },
      {
        field: "merchant",
        headerName: "Merchant",
        flex: 2,
        minWidth: 140,
        cellRenderer: MerchantCell,
      },
      {
        field: "amount",
        headerName: "Amount",
        width: 120,
        headerClass: "ag-right-aligned-header",
        cellStyle: { display: "flex", justifyContent: "flex-end" },
        cellRenderer: AmountCell,
      },
      {
        headerName: "Category",
        flex: 1,
        minWidth: 120,
        valueGetter: ({ data }) => data?.category?.name ?? "",
      },
      {
        headerName: "Account",
        width: 130,
        valueGetter: ({ data }) => data?.bankAccount?.name ?? "",
      },
      {
        field: "notes",
        headerName: "Notes",
        flex: 1,
        minWidth: 80,
        valueFormatter: ({ value }) => value ?? "—",
      },
      {
        headerName: "",
        width: 84,
        sortable: false,
        resizable: false,
        cellRenderer: ActionCell,
      },
    ],
    [ActionCell],
  );

  return (
    <>
      <div className="flex items-center gap-2 pb-2">
        <input
          type="search"
          placeholder="Search transactions…"
          className="h-8 w-64 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          value={quickFilter}
          onChange={(e) => setQuickFilter(e.target.value)}
        />
        <div className="ml-auto flex items-center gap-2">
          {transactions.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {transactions.length} transaction
              {transactions.length !== 1 ? "s" : ""}
            </span>
          )}
          <CsvImportModal categories={categories} bankAccounts={bankAccounts} />
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <AgGridReact<Transaction>
          theme={theme}
          rowData={transactions}
          columnDefs={colDefs}
          context={context}
          quickFilterText={quickFilter}
          domLayout="autoHeight"
          defaultColDef={{ sortable: true, resizable: true }}
          pinnedTopRowData={[{}]}
          isFullWidthRow={(params) => params.rowNode.rowPinned === "top"}
          fullWidthCellRenderer={AddRowCellRenderer}
          getRowHeight={(params) => (params.node.rowPinned === "top" ? 48 : 40)}
          noRowsOverlayComponent={() => (
            <div className="flex flex-col items-center gap-3 pt-16 pb-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <IconReceipt className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No transactions yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Use the row above to log your first transaction.
                </p>
              </div>
            </div>
          )}
          suppressCellFocus
          suppressMovableColumns
          animateRows
        />
      </div>

      <Sheet
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
      >
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Transaction</SheetTitle>
          </SheetHeader>
          {editingTransaction && (
            <TransactionForm
              categories={categories}
              bankAccounts={bankAccounts}
              transaction={editingTransaction}
              onSuccess={() => setEditingTransaction(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

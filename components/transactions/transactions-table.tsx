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
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconDownload,
  IconEdit,
  IconReceipt,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { type ColDef, type ICellRendererParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useRef, useState, useCallback, useMemo, useEffect } from "react";

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

type DayHeader = { __type: "day-header"; date: string; total: number };
type GridRow = Transaction | DayHeader;

function isDayHeader(row: GridRow): row is DayHeader {
  return (row as DayHeader).__type === "day-header";
}

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

// ── Day header renderer ───────────────────────────────────────────────────────

function DayHeaderRenderer({ data }: ICellRendererParams) {
  const { date, total } = data as DayHeader;
  const label = new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <div className="flex items-center justify-between px-4 h-full bg-muted/40 border-b text-sm text-muted-foreground font-medium">
      <span>{label}</span>
      <span className="tabular-nums">{formatCurrency(total)}</span>
    </div>
  );
}

function FullWidthCellDispatcher(params: ICellRendererParams) {
  if (params.node.rowPinned === "top") return <AddRowCellRenderer {...params} />;
  return <DayHeaderRenderer {...params} />;
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

function ActionCellRenderer({ data, context }: ICellRendererParams<Transaction>) {
  if (!data) return null;
  const { onEdit, onDelete } = context as GridContext;
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => onEdit(data)}
      >
        <IconEdit className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive"
        onClick={() => onDelete(data.id)}
      >
        <IconTrash className="size-3.5" />
      </Button>
    </div>
  );
}

// ── Pagination helpers ───────────────────────────────────────────────────────

function buildPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

// ── Main export ───────────────────────────────────────────────────────────────

interface TransactionsTableProps {
  initialData: { transactions: Transaction[]; total: number };
  categories: Category[];
  bankAccounts: BankAccount[];
  month: number;
  year: number;
  initialSearch: string;
  initialPage: number;
  initialPageSize: number | "all";
}

export function TransactionsTable({
  initialData,
  categories,
  bankAccounts,
  month,
  year,
  initialSearch,
  initialPage,
  initialPageSize,
}: TransactionsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const theme = useAgGridTheme();

  const [transactions, setTransactions] = useState(initialData.transactions);
  const [total, setTotal] = useState(initialData.total);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState<number | "all">(initialPageSize);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [loading, setLoading] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Cleanup debounce on unmount
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  // Sync state when server-side props change (e.g. month navigation)
  useEffect(() => {
    setTransactions(initialData.transactions);
    setTotal(initialData.total);
    setPage(initialPage);
    setPageSize(initialPageSize);
    setSearchInput(initialSearch);
  }, [initialData, initialPage, initialPageSize, initialSearch]);

  // ── URL sync ─────────────────────────────────────────────────────────────

  const updateUrl = useCallback(
    (updates: {
      page?: number;
      pageSize?: number | "all";
      search?: string;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.page !== undefined) {
        if (updates.page <= 1) params.delete("page");
        else params.set("page", String(updates.page));
      }
      if (updates.pageSize !== undefined) {
        if (updates.pageSize === 20) params.delete("pageSize");
        else params.set("pageSize", String(updates.pageSize));
      }
      if (updates.search !== undefined) {
        if (updates.search) params.set("search", updates.search);
        else params.delete("search");
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchData = useCallback(
    async (params: {
      page: number;
      pageSize: number | "all";
      search: string;
    }) => {
      setLoading(true);
      try {
        const sp = new URLSearchParams({
          month: String(month),
          year: String(year),
          page: String(params.page),
          pageSize: String(params.pageSize),
        });
        if (params.search) sp.set("search", params.search);
        const res = await fetch(`/api/transactions?${sp.toString()}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setTransactions(data.transactions);
        setTotal(data.total);
      } finally {
        setLoading(false);
      }
    },
    [month, year],
  );

  const refetchCurrentPage = useCallback(() => {
    fetchData({ page, pageSize, search: searchInput });
  }, [fetchData, page, pageSize, searchInput]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this transaction?")) return;
      await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      // If this was the last item on the page, go to previous page
      if (transactions.length === 1 && page > 1) {
        const newPage = page - 1;
        setPage(newPage);
        updateUrl({ page: newPage });
        fetchData({ page: newPage, pageSize, search: searchInput });
      } else {
        refetchCurrentPage();
      }
    },
    [
      transactions.length,
      page,
      pageSize,
      searchInput,
      updateUrl,
      fetchData,
      refetchCurrentPage,
    ],
  );

  function handleSearchChange(value: string) {
    setSearchInput(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      updateUrl({ search: value, page: 1 });
      fetchData({ page: 1, pageSize, search: value });
    }, 300);
  }

  function handlePageSizeChange(value: string) {
    const newSize = value === "all" ? ("all" as const) : parseInt(value);
    setPageSize(newSize);
    setPage(1);
    updateUrl({ pageSize: newSize, page: 1 });
    fetchData({ page: 1, pageSize: newSize, search: searchInput });
  }

  function goToPage(newPage: number) {
    setPage(newPage);
    updateUrl({ page: newPage });
    fetchData({ page: newPage, pageSize, search: searchInput });
  }

  const context: GridContext = useMemo(
    () => ({
      categories,
      bankAccounts,
      onSaved: refetchCurrentPage,
      onEdit: setEditingTransaction,
      onDelete: handleDelete,
    }),
    [categories, bankAccounts, refetchCurrentPage, handleDelete],
  );

  const rowData: GridRow[] = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => {
      const diff =
        new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortDir === "desc" ? -diff : diff;
    });
    const result: GridRow[] = [];
    let lastDate: string | null = null;
    for (const t of sorted) {
      const dateKey = new Date(t.date).toISOString().split("T")[0];
      if (dateKey !== lastDate) {
        const dayTotal = sorted
          .filter(
            (tx) =>
              new Date(tx.date).toISOString().split("T")[0] === dateKey &&
              tx.type === "EXPENSE",
          )
          .reduce((sum, tx) => sum + tx.amount, 0);
        result.push({ __type: "day-header", date: dateKey, total: dayTotal });
        lastDate = dateKey;
      }
      result.push(t);
    }
    return result;
  }, [transactions, sortDir]);

  const colDefs: ColDef<GridRow>[] = useMemo(
    () => [
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
        valueGetter: ({ data }) => (data as Transaction | undefined)?.category?.name ?? "",
      },
      {
        headerName: "Account",
        width: 130,
        valueGetter: ({ data }) => (data as Transaction | undefined)?.bankAccount?.name ?? "",
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
        cellRenderer: ActionCellRenderer,
      },
    ],
    [],
  );

  const totalPages =
    pageSize === "all" ? 1 : Math.max(1, Math.ceil(total / pageSize));
  const showPagination = pageSize !== "all" && totalPages > 1;
  const rangeStart =
    pageSize === "all" ? 1 : (page - 1) * (pageSize as number) + 1;
  const rangeEnd =
    pageSize === "all"
      ? total
      : Math.min(page * (pageSize as number), total);

  return (
    <>
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 pb-2">
        <input
          type="search"
          placeholder="Search transactions…"
          className="h-8 w-64 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
        >
          Date
          {sortDir === "desc" ? (
            <IconChevronDown className="size-3.5" />
          ) : (
            <IconChevronUp className="size-3.5" />
          )}
        </Button>
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          value={String(pageSize)}
          onChange={(e) => handlePageSizeChange(e.target.value)}
        >
          <option value="20">Show 20</option>
          <option value="50">Show 50</option>
          <option value="all">Show All</option>
        </select>
        <div className="ml-auto flex items-center gap-2">
          {total > 0 && (
            <span className="text-xs text-muted-foreground">
              {total} transaction{total !== 1 ? "s" : ""}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => {
              const a = document.createElement("a");
              a.href = "/api/transactions/export";
              a.download = "transactions.csv";
              a.click();
            }}
          >
            <IconDownload className="size-3.5" />
            Export CSV
          </Button>
          <CsvImportModal
            categories={categories}
            bankAccounts={bankAccounts}
            onImported={refetchCurrentPage}
          />
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      <div className="rounded-lg border overflow-hidden">
        <AgGridReact<GridRow>
          theme={theme}
          rowData={rowData}
          columnDefs={colDefs}
          context={context}
          domLayout="autoHeight"
          defaultColDef={{ sortable: false, resizable: true }}
          pinnedTopRowData={[{}]}
          isFullWidthRow={(params) =>
            params.rowNode.rowPinned === "top" ||
            (params.rowNode.data != null && isDayHeader(params.rowNode.data))
          }
          fullWidthCellRenderer={FullWidthCellDispatcher}
          getRowHeight={(params) => {
            if (params.node.rowPinned === "top") return 48;
            if (params.data && isDayHeader(params.data as GridRow)) return 36;
            return 40;
          }}
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
          loading={loading}
          suppressCellFocus
          suppressMovableColumns
          animateRows
          onGridSizeChanged={(params) => params.api.sizeColumnsToFit()}
        />
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {showPagination && (
        <div className="flex items-center justify-between px-1 pt-2">
          <span className="text-xs text-muted-foreground">
            Showing {rangeStart}–{rangeEnd} of {total}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              <IconChevronLeft className="size-4" />
            </Button>
            {buildPageNumbers(page, totalPages).map((p, i) =>
              p === "..." ? (
                <span
                  key={`ellipsis-${i}`}
                  className="px-1 text-xs text-muted-foreground"
                >
                  ...
                </span>
              ) : (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="icon"
                  className="h-7 w-7 text-xs"
                  onClick={() => goToPage(p)}
                >
                  {p}
                </Button>
              ),
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
            >
              <IconChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Edit sheet ──────────────────────────────────────────────────── */}
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
              onSuccess={() => {
                setEditingTransaction(null);
                refetchCurrentPage();
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

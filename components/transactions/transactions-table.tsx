"use client";

import { TransactionForm } from "./transaction-form";
import { AddTransactionButton } from "./add-transaction-button";
import { CsvImportModal } from "./csv-import-modal";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCurrency, cn } from "@/lib/utils";
import { useAgGridTheme } from "@/lib/ag-grid";
import {
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconEdit,
  IconReceipt,
  IconTrash,
} from "@tabler/icons-react";
import { type ColDef, type ICellRendererParams, type SortChangedEvent, type GridReadyEvent } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import type { SortField } from "@/lib/transactions";

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
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
};

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
  initialSortBy: SortField;
  initialSortDir: "asc" | "desc";
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
  initialSortBy,
  initialSortDir,
}: TransactionsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const theme = useAgGridTheme();
  const gridRef = useRef<AgGridReact>(null);
  const sortProgrammatic = useRef(false);

  const [transactions, setTransactions] = useState(initialData.transactions);
  const [total, setTotal] = useState(initialData.total);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState<number | "all">(initialPageSize);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [loading, setLoading] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [sortBy, setSortBy] = useState<SortField>(initialSortBy);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialSortDir);

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
    setSortBy(initialSortBy);
    setSortDir(initialSortDir);
  }, [initialData, initialPage, initialPageSize, initialSearch, initialSortBy, initialSortDir]);

  // Sync date column visibility when sort changes
  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    api.setColumnsVisible(["date"], sortBy !== "date");
  }, [sortBy]);

  // ── URL sync ─────────────────────────────────────────────────────────────

  const updateUrl = useCallback(
    (updates: {
      page?: number;
      pageSize?: number | "all";
      search?: string;
      sortBy?: SortField;
      sortDir?: "asc" | "desc";
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
      if (updates.sortBy !== undefined) {
        if (updates.sortBy === "date") params.delete("sortBy");
        else params.set("sortBy", updates.sortBy);
      }
      if (updates.sortDir !== undefined) {
        if (updates.sortDir === "desc") params.delete("sortDir");
        else params.set("sortDir", updates.sortDir);
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
      sortBy: SortField;
      sortDir: "asc" | "desc";
    }) => {
      setLoading(true);
      try {
        const sp = new URLSearchParams({
          month: String(month),
          year: String(year),
          page: String(params.page),
          pageSize: String(params.pageSize),
          sortBy: params.sortBy,
          sortDir: params.sortDir,
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
    fetchData({ page, pageSize, search: searchInput, sortBy, sortDir });
  }, [fetchData, page, pageSize, searchInput, sortBy, sortDir]);

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
        fetchData({ page: newPage, pageSize, search: searchInput, sortBy, sortDir });
      } else {
        refetchCurrentPage();
      }
    },
    [
      transactions.length,
      page,
      pageSize,
      searchInput,
      sortBy,
      sortDir,
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
      fetchData({ page: 1, pageSize, search: value, sortBy, sortDir });
    }, 300);
  }

  function handlePageSizeChange(value: string) {
    const newSize = value === "all" ? ("all" as const) : parseInt(value);
    setPageSize(newSize);
    setPage(1);
    updateUrl({ pageSize: newSize, page: 1 });
    fetchData({ page: 1, pageSize: newSize, search: searchInput, sortBy, sortDir });
  }

  function goToPage(newPage: number) {
    setPage(newPage);
    updateUrl({ page: newPage });
    fetchData({ page: newPage, pageSize, search: searchInput, sortBy, sortDir });
  }

  const handleSortChanged = useCallback((e: SortChangedEvent) => {
    if (sortProgrammatic.current) return;
    const col = e.api.getColumnState().find((c) => c.sort != null);
    const newSortBy = (col?.colId ?? "date") as SortField;
    const newSortDir = (col?.sort ?? "desc") as "asc" | "desc";
    setSortBy(newSortBy);
    setSortDir(newSortDir);
    setPage(1);
    updateUrl({ page: 1, sortBy: newSortBy, sortDir: newSortDir });
    fetchData({ page: 1, pageSize, search: searchInput, sortBy: newSortBy, sortDir: newSortDir });
  }, [updateUrl, fetchData, pageSize, searchInput]);

  const handleGridReady = useCallback((e: GridReadyEvent) => {
    sortProgrammatic.current = true;
    e.api.applyColumnState({
      state: [{ colId: sortBy, sort: sortDir }],
      defaultState: { sort: null },
    });
    e.api.setColumnsVisible(["date"], sortBy !== "date");
    sortProgrammatic.current = false;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const context: GridContext = useMemo(
    () => ({
      categories,
      bankAccounts,
      onEdit: setEditingTransaction,
      onDelete: handleDelete,
    }),
    [categories, bankAccounts, handleDelete],
  );

  // Data comes pre-sorted from server; insert day-header rows only when sorting by date
  const rowData: GridRow[] = useMemo(() => {
    if (sortBy !== "date") return transactions;
    const result: GridRow[] = [];
    let lastDate: string | null = null;
    for (const t of transactions) {
      const dateKey = new Date(t.date).toISOString().split("T")[0];
      if (dateKey !== lastDate) {
        const dayTotal = transactions
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
  }, [transactions, sortBy]);

  const colDefs: ColDef<GridRow>[] = useMemo(
    () => [
      {
        colId: "date",
        headerName: "Date",
        width: 110,
        hide: true, // shown only when not sorting by date (controlled via grid API)
        valueGetter: ({ data }) => {
          const t = data as Transaction | undefined;
          if (!t || isDayHeader(data as GridRow)) return "";
          return new Date(t.date).toLocaleDateString("en-US", {
            month: "short", day: "numeric", timeZone: "UTC",
          });
        },
      },
      {
        field: "type",
        colId: "type",
        headerName: "Type",
        width: 105,
        cellRenderer: TypeBadge,
      },
      {
        field: "merchant",
        colId: "merchant",
        headerName: "Merchant",
        flex: 2,
        minWidth: 140,
        cellRenderer: MerchantCell,
      },
      {
        field: "amount",
        colId: "amount",
        headerName: "Amount",
        width: 120,
        headerClass: "ag-right-aligned-header",
        cellStyle: { display: "flex", justifyContent: "flex-end" },
        cellRenderer: AmountCell,
      },
      {
        colId: "category",
        headerName: "Category",
        flex: 1,
        minWidth: 120,
        valueGetter: ({ data }) => (data as Transaction | undefined)?.category?.name ?? "",
      },
      {
        colId: "account",
        headerName: "Account",
        width: 130,
        valueGetter: ({ data }) => (data as Transaction | undefined)?.bankAccount?.name ?? "",
      },
      {
        field: "notes",
        colId: "notes",
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
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <input
          type="search"
          placeholder="Search transactions…"
          className="h-8 w-48 min-w-0 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
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
            <span className="hidden sm:inline text-xs text-muted-foreground">
              {total} transaction{total !== 1 ? "s" : ""}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 hidden sm:flex"
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
          <AddTransactionButton
            categories={categories}
            bankAccounts={bankAccounts}
            onSuccess={refetchCurrentPage}
          />
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      <div className="rounded-lg border overflow-x-auto">
        <div className="min-w-[600px]">
        <AgGridReact<GridRow>
          ref={gridRef}
          theme={theme}
          rowData={rowData}
          columnDefs={colDefs}
          context={context}
          domLayout="autoHeight"
          defaultColDef={{ sortable: true, resizable: true, comparator: () => 0 }}
          isFullWidthRow={(params) =>
            params.rowNode.data != null && isDayHeader(params.rowNode.data)
          }
          fullWidthCellRenderer={FullWidthCellDispatcher}
          getRowHeight={(params) => {
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
                  Use the Add Transaction button to log your first transaction.
                </p>
              </div>
            </div>
          )}
          loading={loading}
          suppressCellFocus
          suppressMovableColumns
          animateRows
          onGridReady={handleGridReady}
          onSortChanged={handleSortChanged}
          onGridSizeChanged={(params) => params.api.sizeColumnsToFit()}
        />
        </div>
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

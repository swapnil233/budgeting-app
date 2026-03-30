"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { Pencil } from "lucide-react";
import { formatCurrency, cn, dollarsToCents } from "@/lib/utils";
import {
  useAgGridTheme,
  GROUP_ORDER,
  GROUP_LABELS,
} from "@/lib/ag-grid";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconChartBar } from "@tabler/icons-react";
import { type ColDef, type ICellRendererParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type BudgetRow = {
  categoryId: string;
  categoryName: string;
  group: string;
  budgetAmount: number;
  spent: number;
  left: number;
  percentage: number;
  status: "OK" | "CLOSE" | "OVER";
};

type GroupHeader = { __type: "group"; group: string };
type SubtotalRow = {
  __type: "subtotal";
  group: string;
  budgetTotal: number;
  spentTotal: number;
  leftTotal: number;
};
type RowItem = BudgetRow | GroupHeader | SubtotalRow;

function isGroupHeader(row: RowItem): row is GroupHeader {
  return "__type" in row && row.__type === "group";
}
function isSubtotal(row: RowItem): row is SubtotalRow {
  return "__type" in row && row.__type === "subtotal";
}
function isBudgetRow(row: RowItem): row is BudgetRow {
  return !("__type" in row);
}

type BudgetGridContext = {
  onBudgetUpdate: (categoryId: string, newCents: number) => void;
  onEdit: (row: BudgetRow) => void;
};

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "OK" | "CLOSE" | "OVER" }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-xs font-medium",
        status === "OK" && "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
        status === "CLOSE" && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
        status === "OVER" && "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
      )}
    >
      {status}
    </span>
  );
}

// ── Group header full-width renderer ──────────────────────────────────────────

function GroupHeaderRenderer({ data }: ICellRendererParams<RowItem>) {
  if (!data || !isGroupHeader(data)) return null;
  return (
    <div className="flex h-full items-center bg-muted/50 px-4 font-semibold text-sm uppercase tracking-wider text-muted-foreground">
      {GROUP_LABELS[data.group]}
    </div>
  );
}

// ── Inline budget edit cell ───────────────────────────────────────────────────

function BudgetEditCellInner({ row, context }: { row: BudgetRow; context: BudgetGridContext }) {
  const { onBudgetUpdate } = context;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState((row.budgetAmount / 100).toFixed(2));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function commitEdit() {
    const cents = dollarsToCents(value);
    if (isNaN(cents) || cents < 0) { setEditing(false); return; }
    setSaving(true);
    onBudgetUpdate(row.categoryId, cents);
    setSaving(false);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
    if (e.key === "Escape") {
      setValue((row.budgetAmount / 100).toFixed(2));
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min="0"
        step="0.01"
        className="w-24 text-right bg-background border rounded px-1 py-0.5 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={handleKeyDown}
        autoFocus
        disabled={saving}
      />
    );
  }

  return (
    <span
      className="tabular-nums text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
      onClick={() => {
        setValue((row.budgetAmount / 100).toFixed(2));
        setEditing(true);
      }}
    >
      {row.budgetAmount > 0 ? formatCurrency(row.budgetAmount) : "—"}
    </span>
  );
}

function BudgetEditCell({ data, context }: ICellRendererParams<RowItem>) {
  if (!data) return null;
  if (isSubtotal(data)) {
    return (
      <span className="font-medium text-xs tabular-nums text-muted-foreground">
        {data.budgetTotal > 0 ? formatCurrency(data.budgetTotal) : "—"}
      </span>
    );
  }
  if (!isBudgetRow(data)) return null;
  return <BudgetEditCellInner row={data} context={context as BudgetGridContext} />;
}

// ── Spent cell ────────────────────────────────────────────────────────────────

function SpentCell({ data }: ICellRendererParams<RowItem>) {
  if (!data) return null;
  if (isSubtotal(data)) {
    return (
      <span className="font-medium text-xs tabular-nums text-muted-foreground">
        {formatCurrency(data.spentTotal)}
      </span>
    );
  }
  if (!isBudgetRow(data)) return null;
  return (
    <span className="tabular-nums">
      {data.spent > 0 ? formatCurrency(data.spent) : "—"}
    </span>
  );
}

// ── Left cell ─────────────────────────────────────────────────────────────────

function LeftCell({ data }: ICellRendererParams<RowItem>) {
  if (!data) return null;
  if (isSubtotal(data)) {
    return (
      <span
        className={cn(
          "font-medium text-xs tabular-nums",
          data.budgetTotal > 0 && data.leftTotal < 0
            ? "text-red-600 dark:text-red-400"
            : "text-green-600 dark:text-green-400",
        )}
      >
        {data.budgetTotal > 0 ? formatCurrency(data.leftTotal) : "—"}
      </span>
    );
  }
  if (!isBudgetRow(data)) return null;
  if (data.budgetAmount <= 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "tabular-nums",
        data.left < 0
          ? "text-red-600 dark:text-red-400"
          : "text-green-600 dark:text-green-400",
      )}
    >
      {formatCurrency(data.left)}
    </span>
  );
}

// ── Percentage cell ───────────────────────────────────────────────────────────

function PercentageCell({ data }: ICellRendererParams<RowItem>) {
  if (!data || !isBudgetRow(data)) return null;
  if (data.budgetAmount <= 0) return <span className="text-muted-foreground">—</span>;
  return <span className="tabular-nums text-muted-foreground">{data.percentage}%</span>;
}

// ── Status cell ───────────────────────────────────────────────────────────────

function StatusCell({ data }: ICellRendererParams<RowItem>) {
  if (!data || !isBudgetRow(data) || data.budgetAmount <= 0) return null;
  return <StatusBadge status={data.status} />;
}

// ── Category name cell (handles subtotals) ────────────────────────────────────

function CategoryCell({ data }: ICellRendererParams<RowItem>) {
  if (!data) return null;
  if (isSubtotal(data)) {
    return <span className="font-medium text-xs text-muted-foreground">Subtotal</span>;
  }
  if (!isBudgetRow(data)) return null;
  return <span>{data.categoryName}</span>;
}

// ── Main export ───────────────────────────────────────────────────────────────

interface BudgetTableProps {
  rows: BudgetRow[];
  totalInflow: number;
  totalExpenses: number;
  netPosition: number;
}

export function BudgetTable({ rows: initialRows, totalInflow, totalExpenses, netPosition }: BudgetTableProps) {
  const theme = useAgGridTheme();
  const isMobile = useIsMobile();
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<null | "create" | string>(null);
  const [formName, setFormName] = useState("");
  const [formGroup, setFormGroup] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [saving, setSaving] = useState(false);

  // Filter rows by search
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => r.categoryName.toLowerCase().includes(q));
  }, [rows, search]);

  // Build interleaved row data with group headers and subtotals
  const rowData: RowItem[] = useMemo(() => {
    const result: RowItem[] = [];
    for (const group of GROUP_ORDER) {
      const groupRows = filteredRows.filter((r) => r.group === group);
      if (groupRows.length === 0) continue;

      result.push({ __type: "group", group });
      result.push(...groupRows);

      const budgetTotal = groupRows.reduce((s, r) => s + r.budgetAmount, 0);
      const spentTotal = groupRows.reduce((s, r) => s + r.spent, 0);
      result.push({
        __type: "subtotal",
        group,
        budgetTotal,
        spentTotal,
        leftTotal: budgetTotal - spentTotal,
      });
    }
    return result;
  }, [filteredRows]);

  // Budget update handler (optimistic + API)
  const handleBudgetUpdate = useCallback(
    async (categoryId: string, cents: number) => {
      setRows((prev) =>
        prev.map((r) => {
          if (r.categoryId !== categoryId) return r;
          const left = cents - r.spent;
          const percentage = cents > 0 ? Math.round((r.spent / cents) * 100) : 0;
          const status: "OK" | "CLOSE" | "OVER" =
            percentage > 100 ? "OVER" : percentage >= 80 ? "CLOSE" : "OK";
          return { ...r, budgetAmount: cents, left, percentage, status };
        }),
      );

      await fetch("/api/budgets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, budgetAmount: cents }),
      });
    },
    [],
  );

  // Dialog handlers
  function openCreate() {
    setFormName(""); setFormGroup(""); setFormAmount("");
    setDialog("create");
  }

  function openEdit(row: BudgetRow) {
    setFormName(row.categoryName);
    setFormGroup(row.group);
    setFormAmount((row.budgetAmount / 100).toFixed(2));
    setDialog(row.categoryId);
  }

  async function submitDialog() {
    if (!formName.trim() || !formGroup) return;
    const cents = formAmount ? dollarsToCents(formAmount) : 0;
    setSaving(true);

    if (dialog === "create") {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), group: formGroup, budgetAmount: cents }),
      });
      if (res.ok) {
        const cat = await res.json();
        setRows((prev) => [...prev, {
          categoryId: cat.id, categoryName: cat.name, group: cat.group,
          budgetAmount: cents, spent: 0, left: cents, percentage: 0, status: "OK" as const,
        }]);
        setDialog(null);
      }
    } else if (dialog) {
      const categoryId = dialog;
      const existing = rows.find((r) => r.categoryId === categoryId)!;
      const res = await fetch(`/api/categories/${categoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), group: formGroup, budgetAmount: cents }),
      });
      if (res.ok) {
        const left = cents - existing.spent;
        const percentage = cents > 0 ? Math.round((existing.spent / cents) * 100) : 0;
        const status: "OK" | "CLOSE" | "OVER" = percentage > 100 ? "OVER" : percentage >= 80 ? "CLOSE" : "OK";
        setRows((prev) => prev.map((r) => r.categoryId === categoryId
          ? { ...r, categoryName: formName.trim(), group: formGroup, budgetAmount: cents, left, percentage, status }
          : r,
        ));
        setDialog(null);
      }
    }

    setSaving(false);
  }

  // Grid context
  const gridContext: BudgetGridContext = useMemo(
    () => ({
      onBudgetUpdate: handleBudgetUpdate,
      onEdit: openEdit,
    }),
    [handleBudgetUpdate],
  );

  // Edit button cell — uses context so the callback is always fresh
  const EditButtonCell = useCallback(
    ({ data, context }: ICellRendererParams<RowItem>) => {
      if (!data || !isBudgetRow(data)) return null;
      const { onEdit } = context as BudgetGridContext;
      return (
        <button
          onClick={() => onEdit(data)}
          className="rounded p-1 hover:bg-muted text-muted-foreground transition-colors"
          title="Edit category"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      );
    },
    [],
  );

  // Column definitions
  const colDefs: ColDef<RowItem>[] = useMemo(
    () => [
      {
        headerName: "Category",
        flex: 2,
        minWidth: 140,
        cellRenderer: CategoryCell,
      },
      {
        headerName: "Budget",
        width: 110,
        headerClass: "ag-right-aligned-header",
        cellStyle: { display: "flex", justifyContent: "flex-end" },
        cellRenderer: BudgetEditCell,
      },
      {
        headerName: "Spent",
        width: 110,
        headerClass: "ag-right-aligned-header",
        cellStyle: { display: "flex", justifyContent: "flex-end" },
        cellRenderer: SpentCell,
      },
      {
        headerName: "Left",
        width: 110,
        headerClass: "ag-right-aligned-header",
        cellStyle: { display: "flex", justifyContent: "flex-end" },
        cellRenderer: LeftCell,
      },
      {
        headerName: "%",
        width: 70,
        headerClass: "ag-right-aligned-header",
        cellStyle: { display: "flex", justifyContent: "flex-end" },
        cellRenderer: PercentageCell,
        hide: isMobile,
      },
      {
        headerName: "Status",
        width: 80,
        cellRenderer: StatusCell,
        hide: isMobile,
      },
      {
        headerName: "",
        width: 40,
        sortable: false,
        resizable: false,
        cellRenderer: EditButtonCell,
      },
    ],
    [isMobile, EditButtonCell],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <input
          type="search"
          placeholder="Search categories…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <Button size="sm" onClick={openCreate}>New Budget</Button>
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open) setDialog(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{dialog === "create" ? "New Budget Category" : "Edit Category"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="form-name">Name</Label>
              <Input
                id="form-name"
                placeholder="e.g. Gym"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitDialog()}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="form-group">Group</Label>
              <Select value={formGroup} onValueChange={setFormGroup}>
                <SelectTrigger id="form-group">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">Fixed</SelectItem>
                  <SelectItem value="SUBSCRIPTIONS">Subscriptions</SelectItem>
                  <SelectItem value="FOOD">Food</SelectItem>
                  <SelectItem value="LIFESTYLE">Lifestyle</SelectItem>
                  <SelectItem value="PEOPLE_AND_PETS">People &amp; Pets</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="form-amount">Budget Amount</Label>
              <Input
                id="form-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitDialog()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={submitDialog} disabled={!formName.trim() || !formGroup || saving}>
              {saving ? "Saving…" : dialog === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ag-grid table */}
      <div className="rounded-lg border overflow-hidden">
        <AgGridReact<RowItem>
          theme={theme}
          rowData={rowData}
          columnDefs={colDefs}
          context={gridContext}
          domLayout="autoHeight"
          defaultColDef={{ sortable: false, resizable: true }}
          isFullWidthRow={(params) => params.rowNode.data != null && isGroupHeader(params.rowNode.data)}
          fullWidthCellRenderer={GroupHeaderRenderer}
          getRowHeight={(params) => {
            if (params.data && isGroupHeader(params.data)) return 36;
            if (params.data && isSubtotal(params.data)) return 32;
            return 40;
          }}
          getRowClass={(params) => {
            if (params.data && isSubtotal(params.data)) return "bg-muted/30";
            return undefined;
          }}
          noRowsOverlayComponent={() => (
            <div className="flex flex-col items-center gap-3 pt-16 pb-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <IconChartBar className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No budgets found</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {search.trim() ? "Try a different search term." : "Click \"New Budget\" to get started."}
                </p>
              </div>
            </div>
          )}
          suppressCellFocus
          suppressMovableColumns
          animateRows
        />
      </div>

      {/* Summary section */}
      {!search.trim() && (
        <div className="rounded-lg border overflow-hidden">
          <div className="bg-muted/50 px-4 py-2 border-b">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
              Summary
            </h3>
          </div>
          <div className="divide-y">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium">Total Inflow</span>
              <span className="tabular-nums font-medium text-green-600 dark:text-green-400">
                {formatCurrency(totalInflow)}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium">Total Expenses</span>
              <span className="tabular-nums font-medium text-red-600 dark:text-red-400">
                {formatCurrency(totalExpenses)}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium">Net Position</span>
              <span
                className={cn(
                  "tabular-nums font-bold text-base",
                  netPosition >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400",
                )}
              >
                {formatCurrency(netPosition)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

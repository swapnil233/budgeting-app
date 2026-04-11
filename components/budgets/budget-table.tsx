"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { Pencil, Plus, Trash2, CornerDownRight, CheckCircle2, Clock } from "lucide-react";
import { formatCurrency, cn, dollarsToCents } from "@/lib/utils";
import {
  useAgGridTheme,
  GROUP_ORDER,
  GROUP_LABELS,
} from "@/lib/ag-grid";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconChartBar } from "@tabler/icons-react";
import { type ColDef, type ICellRendererParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type RecurringFrequency = "MONTHLY" | "WEEKLY" | "BI_WEEKLY" | "YEARLY";

export type RecurringSummary = {
  id: string;
  name: string;
  amount: number;
  expectedAmount: number;
  paidAmount: number;
  isPaid: boolean;
  frequency: RecurringFrequency;
  dayOfMonth: number | null;
  startDate: string;
  endDate: string | null;
  dueDate: string;
  paymentsRemaining: number | null;
  active: boolean;
  categoryId: string;
  bankAccountId: string | null;
  notes: string | null;
};

type BudgetRow = {
  categoryId: string;
  categoryName: string;
  group: string;
  flexBudget: number;
  recurringBudget: number;
  budgetAmount: number; // effective = flex + recurring
  spent: number;
  left: number;
  percentage: number;
  status: "OK" | "CLOSE" | "OVER";
  recurring: RecurringSummary[];
};

type CategoryOption = { id: string; name: string; group: string };

type GroupHeader = { __type: "group"; group: string };
type SubtotalRow = {
  __type: "subtotal";
  group: string;
  budgetTotal: number;
  spentTotal: number;
  leftTotal: number;
};
type RecurringRow = {
  __type: "recurring";
  parentCategoryId: string;
  parentCategoryName: string;
  group: string;
  recurring: RecurringSummary;
};
type RowItem = BudgetRow | GroupHeader | SubtotalRow | RecurringRow;

function isGroupHeader(row: RowItem): row is GroupHeader {
  return "__type" in row && row.__type === "group";
}
function isSubtotal(row: RowItem): row is SubtotalRow {
  return "__type" in row && row.__type === "subtotal";
}
function isRecurringRow(row: RowItem): row is RecurringRow {
  return "__type" in row && row.__type === "recurring";
}
function isBudgetRow(row: RowItem): row is BudgetRow {
  return !("__type" in row);
}

type BudgetGridContext = {
  onFlexBudgetUpdate: (categoryId: string, newFlexCents: number) => void;
  onEditCategory: (row: BudgetRow) => void;
  onEditRecurring: (row: RecurringRow) => void;
};

// ── Formatting helpers ────────────────────────────────────────────────────────

const DATE_FMT = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric" });

function formatDue(iso: string): string {
  return DATE_FMT.format(new Date(iso));
}

function frequencyLabel(f: RecurringFrequency): string {
  switch (f) {
    case "MONTHLY":
      return "Monthly";
    case "WEEKLY":
      return "Weekly";
    case "BI_WEEKLY":
      return "Bi-weekly";
    case "YEARLY":
      return "Yearly";
  }
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

// Day-of-month options: 1st through 31st plus a "Last day" sentinel (value "0").
const DAY_OF_MONTH_OPTIONS: { value: string; label: string }[] = [
  ...Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1),
    label: ordinal(i + 1),
  })),
  { value: "0", label: "Last day of month" },
];

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "OK" | "CLOSE" | "OVER" }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-xs font-medium",
        status === "OK" &&
          "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
        status === "CLOSE" &&
          "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
        status === "OVER" &&
          "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
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

// ── Inline flex-budget edit cell ──────────────────────────────────────────────

function FlexBudgetEditInner({
  row,
  context,
}: {
  row: BudgetRow;
  context: BudgetGridContext;
}) {
  const { onFlexBudgetUpdate } = context;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState((row.flexBudget / 100).toFixed(2));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function commitEdit() {
    const cents = dollarsToCents(value);
    if (isNaN(cents) || cents < 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    onFlexBudgetUpdate(row.categoryId, cents);
    setSaving(false);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    }
    if (e.key === "Escape") {
      setValue((row.flexBudget / 100).toFixed(2));
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

  const hasRecurring = row.recurringBudget > 0;

  return (
    <span
      className="tabular-nums text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
      title={
        hasRecurring
          ? `Flex ${formatCurrency(row.flexBudget)} + Recurring ${formatCurrency(row.recurringBudget)}`
          : undefined
      }
      onClick={() => {
        setValue((row.flexBudget / 100).toFixed(2));
        setEditing(true);
      }}
    >
      {row.budgetAmount > 0 ? formatCurrency(row.budgetAmount) : "—"}
    </span>
  );
}

function BudgetCell({ data, context }: ICellRendererParams<RowItem>) {
  if (!data) return null;
  if (isSubtotal(data)) {
    return (
      <span className="font-medium text-xs tabular-nums text-muted-foreground">
        {data.budgetTotal > 0 ? formatCurrency(data.budgetTotal) : "—"}
      </span>
    );
  }
  if (isRecurringRow(data)) {
    return (
      <span className="tabular-nums text-muted-foreground text-sm">
        {formatCurrency(data.recurring.expectedAmount)}
      </span>
    );
  }
  if (!isBudgetRow(data)) return null;
  return <FlexBudgetEditInner row={data} context={context as BudgetGridContext} />;
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
  if (isRecurringRow(data)) {
    const { paidAmount } = data.recurring;
    return (
      <span className="tabular-nums text-sm">
        {paidAmount > 0 ? formatCurrency(paidAmount) : "—"}
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
  if (isRecurringRow(data)) {
    const { expectedAmount, paidAmount } = data.recurring;
    const remaining = expectedAmount - paidAmount;
    return (
      <span
        className={cn(
          "tabular-nums text-sm",
          remaining <= 0
            ? "text-green-600 dark:text-green-400"
            : "text-muted-foreground",
        )}
      >
        {remaining <= 0 ? "—" : formatCurrency(remaining)}
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
  if (!data) return null;
  if (isRecurringRow(data)) {
    const { expectedAmount, paidAmount } = data.recurring;
    const pct =
      expectedAmount > 0 ? Math.min(100, Math.round((paidAmount / expectedAmount) * 100)) : 0;
    return <span className="tabular-nums text-muted-foreground text-sm">{pct}%</span>;
  }
  if (!isBudgetRow(data)) return null;
  if (data.budgetAmount <= 0) return <span className="text-muted-foreground">—</span>;
  return <span className="tabular-nums text-muted-foreground">{data.percentage}%</span>;
}

// ── Status cell ───────────────────────────────────────────────────────────────

function StatusCell({ data }: ICellRendererParams<RowItem>) {
  if (!data) return null;
  if (isRecurringRow(data)) {
    const { isPaid, dueDate } = data.recurring;
    if (isPaid) {
      return (
        <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3" /> Paid
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" /> {formatDue(dueDate)}
      </span>
    );
  }
  if (!isBudgetRow(data) || data.budgetAmount <= 0) return null;
  return <StatusBadge status={data.status} />;
}

// ── Category name cell (handles subtotals + recurring) ───────────────────────

function CategoryCell({ data }: ICellRendererParams<RowItem>) {
  if (!data) return null;
  if (isSubtotal(data)) {
    return <span className="font-medium text-xs text-muted-foreground">Subtotal</span>;
  }
  if (isRecurringRow(data)) {
    const { name, frequency, paymentsRemaining } = data.recurring;
    return (
      <div className="flex items-center gap-1.5 pl-5">
        <CornerDownRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
        <span className="text-sm">{name}</span>
        <span className="text-[11px] text-muted-foreground">
          · {frequencyLabel(frequency)}
          {paymentsRemaining !== null && paymentsRemaining > 0 && (
            <> · {paymentsRemaining} left</>
          )}
        </span>
      </div>
    );
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
  categories: CategoryOption[];
}

export function BudgetTable({
  rows: initialRows,
  totalInflow,
  totalExpenses,
  netPosition,
  categories,
}: BudgetTableProps) {
  const theme = useAgGridTheme();
  const isMobile = useIsMobile();
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");

  // Category (flex) create/edit dialog
  const [catDialog, setCatDialog] = useState<null | "create" | string>(null);
  const [formName, setFormName] = useState("");
  const [formGroup, setFormGroup] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [saving, setSaving] = useState(false);

  // Recurring create/edit dialog
  type RecurringDialogState = null | { mode: "create" } | { mode: "edit"; recurring: RecurringSummary };
  const [recDialog, setRecDialog] = useState<RecurringDialogState>(null);
  const [recName, setRecName] = useState("");
  const [recCategoryId, setRecCategoryId] = useState("");
  const [recAmount, setRecAmount] = useState("");
  const [recFrequency, setRecFrequency] = useState<RecurringFrequency>("MONTHLY");
  const [recDayOfMonth, setRecDayOfMonth] = useState("");
  const [recStartDate, setRecStartDate] = useState("");
  const [recEndDate, setRecEndDate] = useState("");
  const [recNotes, setRecNotes] = useState("");
  const [recSaving, setRecSaving] = useState(false);

  // Recalc totals whenever rows change
  const totalBudgeted = useMemo(
    () => rows.reduce((s, r) => s + r.budgetAmount, 0),
    [rows],
  );
  const unallocated = totalInflow - totalBudgeted;

  // Filter rows by search (category name OR any recurring name under it)
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.categoryName.toLowerCase().includes(q) ||
        r.recurring.some((x) => x.name.toLowerCase().includes(q)),
    );
  }, [rows, search]);

  // Build interleaved row data with group headers, recurring sub-rows, and subtotals
  const rowData: RowItem[] = useMemo(() => {
    const result: RowItem[] = [];
    for (const group of GROUP_ORDER) {
      const groupRows = filteredRows.filter((r) => r.group === group);
      if (groupRows.length === 0) continue;

      result.push({ __type: "group", group });

      for (const cat of groupRows) {
        result.push(cat);
        for (const rec of cat.recurring) {
          result.push({
            __type: "recurring",
            parentCategoryId: cat.categoryId,
            parentCategoryName: cat.categoryName,
            group: cat.group,
            recurring: rec,
          });
        }
      }

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

  // ── Mutations ───────────────────────────────────────────────────────────────

  function recomputeCategory(row: BudgetRow, newFlex: number): BudgetRow {
    const budgetAmount = newFlex + row.recurringBudget;
    const left = budgetAmount - row.spent;
    const percentage =
      budgetAmount > 0 ? Math.round((row.spent / budgetAmount) * 100) : 0;
    const status: "OK" | "CLOSE" | "OVER" =
      percentage > 100 ? "OVER" : percentage >= 80 ? "CLOSE" : "OK";
    return { ...row, flexBudget: newFlex, budgetAmount, left, percentage, status };
  }

  const handleFlexBudgetUpdate = useCallback(
    async (categoryId: string, newFlexCents: number) => {
      setRows((prev) =>
        prev.map((r) => (r.categoryId === categoryId ? recomputeCategory(r, newFlexCents) : r)),
      );

      await fetch("/api/budgets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, budgetAmount: newFlexCents }),
      });
    },
    [],
  );

  // Category dialog handlers
  function openCreateCategory() {
    setFormName("");
    setFormGroup("");
    setFormAmount("");
    setCatDialog("create");
  }

  function openEditCategory(row: BudgetRow) {
    setFormName(row.categoryName);
    setFormGroup(row.group);
    setFormAmount((row.flexBudget / 100).toFixed(2));
    setCatDialog(row.categoryId);
  }

  async function submitCategoryDialog() {
    if (!formName.trim() || !formGroup) return;
    const cents = formAmount ? dollarsToCents(formAmount) : 0;
    setSaving(true);

    if (catDialog === "create") {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), group: formGroup, budgetAmount: cents }),
      });
      if (res.ok) {
        const cat = await res.json();
        setRows((prev) => [
          ...prev,
          {
            categoryId: cat.id,
            categoryName: cat.name,
            group: cat.group,
            flexBudget: cents,
            recurringBudget: 0,
            budgetAmount: cents,
            spent: 0,
            left: cents,
            percentage: 0,
            status: "OK" as const,
            recurring: [],
          },
        ]);
        setCatDialog(null);
      }
    } else if (catDialog) {
      const categoryId = catDialog;
      const res = await fetch(`/api/categories/${categoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), group: formGroup, budgetAmount: cents }),
      });
      if (res.ok) {
        setRows((prev) =>
          prev.map((r) =>
            r.categoryId === categoryId
              ? {
                  ...recomputeCategory(r, cents),
                  categoryName: formName.trim(),
                  group: formGroup,
                }
              : r,
          ),
        );
        setCatDialog(null);
      }
    }

    setSaving(false);
  }

  // Recurring dialog handlers
  function openCreateRecurring() {
    setRecName("");
    setRecCategoryId(categories[0]?.id ?? "");
    setRecAmount("");
    setRecFrequency("MONTHLY");
    const today = new Date();
    setRecDayOfMonth(String(today.getDate()));
    setRecStartDate(today.toISOString().slice(0, 10));
    setRecEndDate("");
    setRecNotes("");
    setRecDialog({ mode: "create" });
  }

  function openEditRecurring(row: RecurringRow) {
    const r = row.recurring;
    setRecName(r.name);
    setRecCategoryId(row.parentCategoryId);
    setRecAmount((r.amount / 100).toFixed(2));
    setRecFrequency(r.frequency);
    setRecDayOfMonth(r.dayOfMonth != null ? String(r.dayOfMonth) : "");
    setRecStartDate(r.startDate.slice(0, 10));
    setRecEndDate(r.endDate ? r.endDate.slice(0, 10) : "");
    setRecNotes(r.notes ?? "");
    setRecDialog({ mode: "edit", recurring: r });
  }

  async function submitRecurringDialog() {
    if (!recName.trim() || !recCategoryId || !recAmount || !recStartDate) return;
    setRecSaving(true);

    const payload = {
      name: recName.trim(),
      categoryId: recCategoryId,
      amount: dollarsToCents(recAmount),
      frequency: recFrequency,
      dayOfMonth: recDayOfMonth ? parseInt(recDayOfMonth) : undefined,
      startDate: new Date(recStartDate).toISOString(),
      endDate: recEndDate ? new Date(recEndDate).toISOString() : null,
      notes: recNotes.trim() || null,
    };

    try {
      if (recDialog && recDialog.mode === "create") {
        const res = await fetch("/api/recurring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) return;
      } else if (recDialog && recDialog.mode === "edit") {
        const res = await fetch(`/api/recurring/${recDialog.recurring.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) return;
      }
      // Reload to get fresh occurrence computation
      if (typeof window !== "undefined") window.location.reload();
    } finally {
      setRecSaving(false);
    }
  }

  async function deleteRecurring() {
    if (!recDialog || recDialog.mode !== "edit") return;
    setRecSaving(true);
    try {
      const res = await fetch(`/api/recurring/${recDialog.recurring.id}`, {
        method: "DELETE",
      });
      if (res.ok && typeof window !== "undefined") window.location.reload();
    } finally {
      setRecSaving(false);
    }
  }

  // Grid context
  const gridContext: BudgetGridContext = useMemo(
    () => ({
      onFlexBudgetUpdate: handleFlexBudgetUpdate,
      onEditCategory: openEditCategory,
      onEditRecurring: openEditRecurring,
    }),
    [handleFlexBudgetUpdate],
  );

  // Edit button cell
  const EditButtonCell = useCallback(
    ({ data, context }: ICellRendererParams<RowItem>) => {
      if (!data) return null;
      if (isRecurringRow(data)) {
        const { onEditRecurring } = context as BudgetGridContext;
        return (
          <button
            onClick={() => onEditRecurring(data)}
            className="rounded p-1 hover:bg-muted text-muted-foreground transition-colors"
            title="Edit recurring expense"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        );
      }
      if (!isBudgetRow(data)) return null;
      const { onEditCategory } = context as BudgetGridContext;
      return (
        <button
          onClick={() => onEditCategory(data)}
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
        minWidth: 180,
        cellRenderer: CategoryCell,
      },
      {
        headerName: "Budget",
        width: 130,
        headerClass: "ag-right-aligned-header",
        cellStyle: { display: "flex", justifyContent: "flex-end" },
        cellRenderer: BudgetCell,
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
        width: 110,
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
      {/* Top bar: search + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Search budgets & recurring…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={openCreateRecurring}>
            <Plus className="h-4 w-4" /> New Recurring
          </Button>
          <Button size="sm" onClick={openCreateCategory}>
            <Plus className="h-4 w-4" /> New Budget
          </Button>
        </div>
      </div>

      {/* Unallocated indicator */}
      {totalInflow > 0 && (
        <div className="rounded-lg border px-4 py-2.5 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Inflow</span>
            <span className="tabular-nums font-medium">{formatCurrency(totalInflow)}</span>
            <span className="text-muted-foreground">−</span>
            <span className="text-muted-foreground">Budgeted</span>
            <span className="tabular-nums font-medium">{formatCurrency(totalBudgeted)}</span>
            <span className="text-muted-foreground">=</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Unallocated</span>
            <span
              className={cn(
                "tabular-nums font-semibold",
                unallocated < 0
                  ? "text-red-600 dark:text-red-400"
                  : unallocated === 0
                    ? "text-muted-foreground"
                    : "text-green-600 dark:text-green-400",
              )}
            >
              {formatCurrency(unallocated)}
            </span>
          </div>
        </div>
      )}

      {/* Category create/edit dialog */}
      <Dialog
        open={catDialog !== null}
        onOpenChange={(open) => {
          if (!open) setCatDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {catDialog === "create" ? "New Budget Category" : "Edit Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                placeholder="e.g. Gym"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitCategoryDialog()}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cat-group">Group</Label>
              <Select value={formGroup} onValueChange={setFormGroup}>
                <SelectTrigger id="cat-group">
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
              <Label htmlFor="cat-amount">Flex Budget Amount</Label>
              <Input
                id="cat-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitCategoryDialog()}
              />
              <p className="text-xs text-muted-foreground">
                Fixed recurring items add on top of this amount.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={submitCategoryDialog}
              disabled={!formName.trim() || !formGroup || saving}
            >
              {saving ? "Saving…" : catDialog === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recurring expense create/edit dialog */}
      <Dialog
        open={recDialog !== null}
        onOpenChange={(open) => {
          if (!open) setRecDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {recDialog?.mode === "create" ? "New Recurring Expense" : "Edit Recurring Expense"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rec-name">Name</Label>
              <Input
                id="rec-name"
                placeholder="e.g. Macbook Pro (Affirm)"
                value={recName}
                onChange={(e) => setRecName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rec-category">Category</Label>
              <Select value={recCategoryId} onValueChange={setRecCategoryId}>
                <SelectTrigger id="rec-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rec-amount">Amount</Label>
                <Input
                  id="rec-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={recAmount}
                  onChange={(e) => setRecAmount(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rec-freq">Frequency</Label>
                <Select
                  value={recFrequency}
                  onValueChange={(v) => setRecFrequency(v as RecurringFrequency)}
                >
                  <SelectTrigger id="rec-freq">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="BI_WEEKLY">Bi-weekly</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {recFrequency === "MONTHLY" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rec-day">Day of month</Label>
                <Select value={recDayOfMonth} onValueChange={setRecDayOfMonth}>
                  <SelectTrigger id="rec-day">
                    <SelectValue placeholder="Select a day" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {DAY_OF_MONTH_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  &quot;Last day&quot; adjusts automatically (e.g. Feb 28, Apr 30, May 31).
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rec-start">Start date</Label>
                <Input
                  id="rec-start"
                  type="date"
                  value={recStartDate}
                  onChange={(e) => setRecStartDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rec-end">End date (optional)</Label>
                <Input
                  id="rec-end"
                  type="date"
                  value={recEndDate}
                  onChange={(e) => setRecEndDate(e.target.value)}
                />
              </div>
            </div>
            {recAmount && recStartDate && recEndDate && recFrequency === "MONTHLY" && (
              <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                {(() => {
                  const start = new Date(recStartDate);
                  const end = new Date(recEndDate);
                  const months =
                    (end.getFullYear() - start.getFullYear()) * 12 +
                    (end.getMonth() - start.getMonth()) +
                    1;
                  if (months <= 0) return "End date is before start date.";
                  const total = dollarsToCents(recAmount) * months;
                  return `${formatCurrency(dollarsToCents(recAmount))} × ${months} months = ${formatCurrency(total)} total`;
                })()}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rec-notes">Notes (optional)</Label>
              <Input
                id="rec-notes"
                placeholder="Anything to remember…"
                value={recNotes}
                onChange={(e) => setRecNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <div>
              {recDialog?.mode === "edit" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deleteRecurring}
                  disabled={recSaving}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRecDialog(null)}>
                Cancel
              </Button>
              <Button
                onClick={submitRecurringDialog}
                disabled={
                  !recName.trim() ||
                  !recCategoryId ||
                  !recAmount ||
                  !recStartDate ||
                  recSaving
                }
              >
                {recSaving
                  ? "Saving…"
                  : recDialog?.mode === "create"
                    ? "Create"
                    : "Save"}
              </Button>
            </div>
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
          isFullWidthRow={(params) =>
            params.rowNode.data != null && isGroupHeader(params.rowNode.data)
          }
          fullWidthCellRenderer={GroupHeaderRenderer}
          getRowHeight={(params) => {
            if (params.data && isGroupHeader(params.data)) return 36;
            if (params.data && isSubtotal(params.data)) return 32;
            if (params.data && isRecurringRow(params.data)) return 36;
            return 40;
          }}
          getRowClass={(params) => {
            if (params.data && isSubtotal(params.data)) return "bg-muted/30";
            if (params.data && isRecurringRow(params.data)) return "bg-muted/10";
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
                  {search.trim()
                    ? "Try a different search term."
                    : 'Click "New Budget" to get started.'}
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
              <span className="text-sm font-medium">Total Budgeted</span>
              <span className="tabular-nums font-medium text-muted-foreground">
                {formatCurrency(totalBudgeted)}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium">Total Expenses</span>
              <span className="tabular-nums font-medium text-red-600 dark:text-red-400">
                {formatCurrency(totalExpenses)}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium">Unallocated</span>
              <span
                className={cn(
                  "tabular-nums font-medium",
                  unallocated < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-muted-foreground",
                )}
              >
                {formatCurrency(unallocated)}
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

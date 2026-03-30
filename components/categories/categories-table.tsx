"use client";

import { Button } from "@/components/ui/button";
import {
  useAgGridTheme,
  addRowInput,
  addRowSelect,
  GROUP_ORDER,
  GROUP_LABELS,
} from "@/lib/ag-grid";
import { dollarsToCents, formatCurrency, cn } from "@/lib/utils";
import { IconCheck, IconFolder, IconPencil, IconTrash, IconX } from "@tabler/icons-react";
import { type ColDef, type ICellRendererParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = {
  id: string;
  name: string;
  group: string;
  budgetAmount: number;
};

type GroupHeader = { __isGroupHeader: true; group: string };
type RowItem = Category | GroupHeader;

function isGroupHeader(row: RowItem): row is GroupHeader {
  return "__isGroupHeader" in row && row.__isGroupHeader === true;
}

type CategoriesGridContext = {
  onDelete: (id: string, name: string) => void;
  onSaved: () => void;
};

// ── Pinned add-row renderer ───────────────────────────────────────────────────

function AddRowCellRenderer({ context }: ICellRendererParams) {
  const { onSaved } = context as CategoriesGridContext;
  const nameRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [group, setGroup] = useState("FIXED");
  const [budget, setBudget] = useState("");

  function reset() {
    setName("");
    setGroup("FIXED");
    setBudget("");
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
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          group,
          budgetAmount: budget ? dollarsToCents(budget) : 0,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      reset();
      onSaved();
    } catch {
      setError("Failed to save.");
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
        placeholder="Category name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <select
        className={cn(addRowSelect, "flex-1 shrink-0")}
        value={group}
        onChange={(e) => setGroup(e.target.value)}
      >
        {GROUP_ORDER.map((g) => (
          <option key={g} value={g}>{GROUP_LABELS[g]}</option>
        ))}
      </select>
      <input
        type="number"
        min="0"
        step="0.01"
        className={cn(addRowInput, "w-[110px] shrink-0 text-right")}
        placeholder="No limit"
        value={budget}
        onChange={(e) => setBudget(e.target.value)}
      />
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

// ── Group header renderer ─────────────────────────────────────────────────────

function GroupHeaderRenderer({ data }: ICellRendererParams) {
  return (
    <div className="flex h-full items-center px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">
      {GROUP_LABELS[data.group]}
    </div>
  );
}

// ── Full-width cell dispatcher ────────────────────────────────────────────────

function FullWidthCellRenderer(params: ICellRendererParams) {
  if (params.node.rowPinned === "top") return <AddRowCellRenderer {...params} />;
  return <GroupHeaderRenderer {...params} />;
}

// ── Budget cell — click to edit inline ────────────────────────────────────────

function BudgetCellRenderer({ data, context }: ICellRendererParams<RowItem>) {
  if (!data || isGroupHeader(data)) return null;
  const category = data as Category;
  const { onSaved } = context as CategoriesGridContext;

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(
    category.budgetAmount > 0 ? (category.budgetAmount / 100).toFixed(2) : "",
  );
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: category.name,
          group: category.group,
          budgetAmount: value ? dollarsToCents(value) : 0,
        }),
      });
      onSaved();
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); save(); }
    if (e.key === "Escape") {
      setValue(category.budgetAmount > 0 ? (category.budgetAmount / 100).toFixed(2) : "");
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground text-sm">$</span>
        <input
          ref={inputRef}
          type="number"
          min="0"
          step="0.01"
          className="w-28 rounded border border-ring bg-background px-1.5 py-0.5 text-right text-sm outline-none ring-1 ring-ring"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={save}
          autoFocus
          disabled={saving}
        />
      </div>
    );
  }

  return (
    <button
      className="group/budget flex items-center gap-1.5 text-sm tabular-nums hover:text-foreground transition-colors"
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      <span className={category.budgetAmount > 0 ? "" : "text-muted-foreground/50"}>
        {category.budgetAmount > 0 ? formatCurrency(category.budgetAmount) : "No limit"}
      </span>
      <IconPencil className="size-3 opacity-0 group-hover/budget:opacity-40 transition-opacity" />
    </button>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function CategoriesTable({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const theme = useAgGridTheme();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Delete "${name}"? Transactions in this category will also be deleted.`)) return;
      setDeletingId(id);
      try {
        await fetch(`/api/categories/${id}`, { method: "DELETE" });
        router.refresh();
      } finally {
        setDeletingId(null);
      }
    },
    [router],
  );

  const context: CategoriesGridContext = useMemo(
    () => ({
      onDelete: handleDelete,
      onSaved: () => router.refresh(),
    }),
    [handleDelete, router],
  );

  const ActionCell = useCallback(
    ({ data }: ICellRendererParams<RowItem>) => {
      if (!data || isGroupHeader(data)) return null;
      const cat = data as Category;
      return (
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => handleDelete(cat.id, cat.name)}
        >
          <IconTrash className="size-3.5" />
        </Button>
      );
    },
    [handleDelete],
  );

  const colDefs: ColDef<RowItem>[] = useMemo(
    () => [
      {
        field: "name" as keyof Category,
        headerName: "Name",
        flex: 2,
        minWidth: 140,
        cellRenderer: ({ data, value }: ICellRendererParams<RowItem>) => {
          if (!data || isGroupHeader(data)) return null;
          return <span className="font-medium">{value}</span>;
        },
      },
      {
        field: "group" as keyof Category,
        headerName: "Group",
        flex: 1,
        minWidth: 120,
        valueFormatter: ({ value }) => GROUP_LABELS[value] ?? value,
      },
      {
        field: "budgetAmount" as keyof Category,
        headerName: "Monthly Budget",
        flex: 1,
        minWidth: 130,
        headerClass: "ag-right-aligned-header",
        cellStyle: { display: "flex", justifyContent: "flex-end" },
        cellRenderer: BudgetCellRenderer,
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

  // Build row data with group header sentinels
  const rowData: RowItem[] = useMemo(() => {
    const result: RowItem[] = [];
    for (const group of GROUP_ORDER) {
      const groupCats = categories.filter((c) => c.group === group);
      if (groupCats.length > 0) {
        result.push({ __isGroupHeader: true, group });
        result.push(...groupCats);
      }
    }
    return result;
  }, [categories]);

  const totalBudget = categories.reduce((s, c) => s + c.budgetAmount, 0);

  return (
    <div className="flex flex-col">
      <div className="rounded-lg border overflow-hidden">
        <AgGridReact<RowItem>
          theme={theme}
          rowData={rowData}
          columnDefs={colDefs}
          context={context}
          domLayout="autoHeight"
          defaultColDef={{ sortable: false, resizable: true }}
          pinnedTopRowData={[{}]}
          isFullWidthRow={(params) =>
            params.rowNode.rowPinned === "top" || (params.rowNode.data != null && isGroupHeader(params.rowNode.data))
          }
          fullWidthCellRenderer={FullWidthCellRenderer}
          getRowHeight={(params) => {
            if (params.node.rowPinned === "top") return 48;
            if (params.data && isGroupHeader(params.data)) return 32;
            return 40;
          }}
          noRowsOverlayComponent={() => (
            <div className="flex flex-col items-center gap-3 pt-16 pb-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <IconFolder className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No categories yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Use the row above to add your first category.
                </p>
              </div>
            </div>
          )}
          suppressCellFocus
          suppressMovableColumns
          animateRows
        />
      </div>
      {categories.length > 0 && (
        <div className="border-x border-b rounded-b-lg px-3 py-2 flex items-center justify-between text-xs text-muted-foreground bg-muted/20">
          <span>{categories.length} categor{categories.length !== 1 ? "ies" : "y"}</span>
          <span>
            Total budget:{" "}
            <span className="font-medium text-foreground">
              {totalBudget > 0 ? formatCurrency(totalBudget) + "/mo" : "—"}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

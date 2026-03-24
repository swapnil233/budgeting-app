"use client";

import { TransactionForm } from "./transaction-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCurrency, dollarsToCents, cn } from "@/lib/utils";
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconEdit,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

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
  bankAccountId: string;
  category: Category;
  bankAccount: BankAccount;
};

type AddRow = {
  date: string;
  type: "EXPENSE" | "INCOME";
  merchant: string;
  amount: string;
  categoryId: string;
  bankAccountId: string;
  notes: string;
};

const GROUP_ORDER = ["FIXED", "SUBSCRIPTIONS", "FOOD", "LIFESTYLE", "PEOPLE_AND_PETS", "OTHER"];
const GROUP_LABELS: Record<string, string> = {
  FIXED: "Fixed",
  SUBSCRIPTIONS: "Subscriptions",
  FOOD: "Food",
  LIFESTYLE: "Lifestyle",
  PEOPLE_AND_PETS: "People & Pets",
  OTHER: "Other",
};

// Shared input class for table cells
const cellInput =
  "w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm outline-none focus:border-ring focus:bg-background focus:ring-1 focus:ring-ring transition-colors placeholder:text-muted-foreground/50";
const cellSelect =
  "w-full rounded border border-transparent bg-transparent px-1 py-1 text-sm outline-none focus:border-ring focus:bg-background focus:ring-1 focus:ring-ring transition-colors cursor-pointer appearance-none";

interface AddRowFormProps {
  categories: Category[];
  bankAccounts: BankAccount[];
  onSave: () => void;
}

function AddRowForm({ categories, bankAccounts, onSave }: AddRowFormProps) {
  const router = useRouter();
  const merchantRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [row, setRow] = useState<AddRow>({
    date: new Date().toISOString().split("T")[0],
    type: "EXPENSE",
    merchant: "",
    amount: "",
    categoryId: categories[0]?.id ?? "",
    bankAccountId: bankAccounts[0]?.id ?? "",
    notes: "",
  });

  function set<K extends keyof AddRow>(key: K, value: AddRow[K]) {
    setRow((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!row.merchant.trim() || !row.amount || !row.categoryId || !row.bankAccountId) {
      setError("Merchant, amount, category, and account are required.");
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
          bankAccountId: row.bankAccountId,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      // Reset form
      setRow({
        date: new Date().toISOString().split("T")[0],
        type: "EXPENSE",
        merchant: "",
        amount: "",
        categoryId: categories[0]?.id ?? "",
        bankAccountId: bankAccounts[0]?.id ?? "",
        notes: "",
      });
      merchantRef.current?.focus();
      router.refresh();
      onSave();
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
    if (e.key === "Escape") {
      setRow({
        date: new Date().toISOString().split("T")[0],
        type: "EXPENSE",
        merchant: "",
        amount: "",
        categoryId: categories[0]?.id ?? "",
        bankAccountId: bankAccounts[0]?.id ?? "",
        notes: "",
      });
      setError(null);
    }
  }

  const categoriesByGroup = GROUP_ORDER.reduce<Record<string, Category[]>>((acc, group) => {
    acc[group] = categories.filter((c) => c.group === group);
    return acc;
  }, {});

  return (
    <>
      <tr
        className="border-b bg-muted/30 hover:bg-muted/40"
        onKeyDown={handleKeyDown}
      >
        {/* Date */}
        <td className="px-2 py-1.5">
          <input
            type="date"
            className={cellInput}
            value={row.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </td>
        {/* Type */}
        <td className="px-2 py-1.5">
          <select
            className={cellSelect}
            value={row.type}
            onChange={(e) => set("type", e.target.value as "EXPENSE" | "INCOME")}
          >
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </select>
        </td>
        {/* Merchant */}
        <td className="px-2 py-1.5">
          <input
            ref={merchantRef}
            type="text"
            className={cellInput}
            placeholder="Merchant"
            value={row.merchant}
            onChange={(e) => set("merchant", e.target.value)}
            autoFocus
          />
        </td>
        {/* Amount */}
        <td className="px-2 py-1.5">
          <input
            type="number"
            min="0"
            step="0.01"
            className={cn(cellInput, "text-right")}
            placeholder="0.00"
            value={row.amount}
            onChange={(e) => set("amount", e.target.value)}
          />
        </td>
        {/* Category */}
        <td className="px-2 py-1.5 hidden md:table-cell">
          <select
            className={cellSelect}
            value={row.categoryId}
            onChange={(e) => set("categoryId", e.target.value)}
          >
            {GROUP_ORDER.map((group) =>
              categoriesByGroup[group]?.length > 0 ? (
                <optgroup key={group} label={GROUP_LABELS[group]}>
                  {categoriesByGroup[group].map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </optgroup>
              ) : null
            )}
          </select>
        </td>
        {/* Account */}
        <td className="px-2 py-1.5 hidden lg:table-cell">
          <select
            className={cellSelect}
            value={row.bankAccountId}
            onChange={(e) => set("bankAccountId", e.target.value)}
          >
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </td>
        {/* Notes */}
        <td className="px-2 py-1.5 hidden xl:table-cell">
          <input
            type="text"
            className={cellInput}
            placeholder="Notes"
            value={row.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </td>
        {/* Actions */}
        <td className="px-2 py-1.5">
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
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
              onClick={() => {
                setRow({
                  date: new Date().toISOString().split("T")[0],
                  type: "EXPENSE",
                  merchant: "",
                  amount: "",
                  categoryId: categories[0]?.id ?? "",
                  bankAccountId: bankAccounts[0]?.id ?? "",
                  notes: "",
                });
                setError(null);
              }}
              title="Clear (Esc)"
            >
              <IconX className="size-4" />
            </Button>
          </div>
        </td>
      </tr>
      {error && (
        <tr className="bg-destructive/5">
          <td colSpan={8} className="px-3 py-1 text-xs text-destructive">
            {error}
          </td>
        </tr>
      )}
    </>
  );
}

// Column helper
const columnHelper = createColumnHelper<Transaction>();

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
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this transaction?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  const columns = [
    columnHelper.accessor("date", {
      header: "Date",
      cell: (info) =>
        new Date(info.getValue()).toLocaleDateString("en-CA", {
          month: "short",
          day: "numeric",
        }),
      sortingFn: "datetime",
    }),
    columnHelper.accessor("type", {
      header: "Type",
      cell: (info) => (
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-xs font-medium",
            info.getValue() === "INCOME"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          )}
        >
          {info.getValue() === "INCOME" ? "Income" : "Expense"}
        </span>
      ),
    }),
    columnHelper.accessor("merchant", {
      header: "Merchant",
      cell: (info) => (
        <span className="font-medium">
          {info.getValue()}
          {info.row.original.review && (
            <span className="ml-2 rounded bg-amber-100 px-1 py-0.5 text-xs text-amber-700">
              Review
            </span>
          )}
        </span>
      ),
    }),
    columnHelper.accessor("amount", {
      header: () => <span className="block text-right">Amount</span>,
      cell: (info) => (
        <span
          className={cn(
            "block text-right font-medium tabular-nums",
            info.row.original.type === "INCOME" ? "text-green-600" : "text-red-600"
          )}
        >
          {info.row.original.type === "INCOME" ? "+" : "−"}
          {formatCurrency(info.getValue())}
        </span>
      ),
      sortingFn: "basic",
    }),
    columnHelper.accessor((row) => row.category.name, {
      id: "category",
      header: "Category",
      cell: (info) => (
        <span className="text-muted-foreground">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor((row) => row.bankAccount.name, {
      id: "account",
      header: "Account",
      cell: (info) => (
        <span className="text-muted-foreground">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("notes", {
      header: "Notes",
      cell: (info) => (
        <span className="text-muted-foreground">{info.getValue() ?? "—"}</span>
      ),
      enableSorting: false,
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setEditingTransaction(info.row.original)}
          >
            <IconEdit className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => handleDelete(info.row.original.id)}
            disabled={deletingId === info.row.original.id}
          >
            <IconTrash className="size-3.5" />
          </Button>
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data: transactions,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b bg-muted/50 text-left">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={cn(
                        "px-3 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap select-none",
                        header.id === "category" && "hidden md:table-cell",
                        header.id === "account" && "hidden lg:table-cell",
                        header.id === "notes" && "hidden xl:table-cell",
                        header.column.getCanSort() && "cursor-pointer hover:text-foreground"
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="text-muted-foreground/50">
                            {header.column.getIsSorted() === "asc" ? (
                              <IconChevronUp className="size-3" />
                            ) : header.column.getIsSorted() === "desc" ? (
                              <IconChevronDown className="size-3" />
                            ) : (
                              <IconChevronDown className="size-3 opacity-30" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              <AddRowForm
                categories={categories}
                bankAccounts={bankAccounts}
                onSave={() => {}}
              />
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    No transactions this month. Add one above.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn(
                          "px-3 py-2.5",
                          cell.column.id === "category" && "hidden md:table-cell",
                          cell.column.id === "account" && "hidden lg:table-cell",
                          cell.column.id === "notes" && "hidden xl:table-cell max-w-[180px] truncate",
                          cell.column.id === "actions" && "w-20"
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {transactions.length > 0 && (
          <div className="border-t px-3 py-2 text-xs text-muted-foreground bg-muted/20">
            {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
          </div>
        )}
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

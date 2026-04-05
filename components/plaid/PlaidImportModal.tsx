"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, dollarsToCents } from "@/lib/utils";
import { getGroupForPfc, formatPfcName } from "@/lib/plaid/category-map";
import { IconX, IconCheck } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = { id: string; name: string; group: string };
type BankAccount = { id: string; name: string };

interface PlaidTx {
  id: string;
  name: string;
  merchantName: string | null;
  amount: number;
  date: string;
  categoryPrimary: string | null;
  categoryDetailed: string | null;
  plaidAccount: { name: string; mask: string | null; type: string } | null;
}

interface ImportRow {
  _id: string;
  selected: boolean;
  date: string;
  merchant: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  categoryId: string | null;
  categoryName: string;
  isNewCategory: boolean;
  categoryPrimary: string | null;
  bankAccountId: string | null;
  notes: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const GROUP_ORDER = ["INCOME", "FIXED", "SUBSCRIPTIONS", "FOOD", "LIFESTYLE", "PEOPLE_AND_PETS", "OTHER"];
const GROUP_LABELS: Record<string, string> = {
  INCOME: "Income",
  FIXED: "Fixed",
  SUBSCRIPTIONS: "Subscriptions",
  FOOD: "Food",
  LIFESTYLE: "Lifestyle",
  PEOPLE_AND_PETS: "People & Pets",
  OTHER: "Other",
};

function inferType(amount: number, categoryPrimary: string | null): "INCOME" | "EXPENSE" {
  if (categoryPrimary === "INCOME" || categoryPrimary === "TRANSFER_IN") return "INCOME";
  return amount < 0 ? "INCOME" : "EXPENSE";
}

// ── Category selector ────────────────────────────────────────────────────────

function CategorySelect({
  row,
  existingCategories,
  newCategoryNames,
  onSelectExisting,
  onSelectNew,
  onStartCustom,
}: {
  row: ImportRow;
  existingCategories: Category[];
  newCategoryNames: string[];
  onSelectExisting: (categoryId: string) => void;
  onSelectNew: (name: string) => void;
  onStartCustom: () => void;
}) {
  const byGroup = GROUP_ORDER.reduce<Record<string, Category[]>>((acc, g) => {
    acc[g] = existingCategories.filter((c) => c.group === g);
    return acc;
  }, {});

  const hasExisting = existingCategories.length > 0;

  // Value encodes whether it's existing (id) or new (__new__:name)
  const value = row.isNewCategory ? `__new__:${row.categoryName}` : (row.categoryId ?? "");

  return (
    <select
      className="min-w-0 w-full rounded bg-background text-foreground text-sm outline-none cursor-pointer"
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "__custom__") {
          onStartCustom();
        } else if (v.startsWith("__new__:")) {
          onSelectNew(v.slice(8));
        } else {
          onSelectExisting(v);
        }
      }}
    >
      {/* New categories from Plaid + custom */}
      <optgroup label="— New categories (will be created)" className="bg-background text-foreground">
        {newCategoryNames.map((name) => (
          <option key={`new:${name}`} value={`__new__:${name}`} className="bg-background text-foreground">
            + {name}
          </option>
        ))}
        <option value="__custom__" className="bg-background text-foreground">
          Type a custom name…
        </option>
      </optgroup>

      {/* Existing user categories */}
      {hasExisting && GROUP_ORDER.map((g) =>
        byGroup[g]?.length ? (
          <optgroup key={g} label={GROUP_LABELS[g]} className="bg-background text-foreground">
            {byGroup[g].map((c) => (
              <option key={c.id} value={c.id} className="bg-background text-foreground">
                {c.name}
              </option>
            ))}
          </optgroup>
        ) : null
      )}
    </select>
  );
}

function InlineCategoryInput({
  onConfirm,
  onCancel,
}: {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit() {
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
    else onCancel();
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        className="min-w-0 flex-1 rounded border bg-background px-1.5 py-0.5 text-sm outline-none focus:ring-1 focus:ring-ring"
        value={value}
        placeholder="Category name"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") onCancel();
        }}
        onBlur={handleSubmit}
      />
      <button onClick={handleSubmit} className="text-muted-foreground hover:text-foreground">
        <IconCheck className="size-3.5" />
      </button>
      <button onClick={onCancel} className="text-muted-foreground hover:text-destructive">
        <IconX className="size-3.5" />
      </button>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function PlaidImportModal({
  open,
  onOpenChange,
  categories,
  bankAccounts,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  bankAccounts: BankAccount[];
  onImported?: () => void;
}) {
  const [step, setStep] = useState<"loading" | "preview" | "importing">("loading");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [editingCategoryRow, setEditingCategoryRow] = useState<string | null>(null);

  // Collect all unique "new" category names: from Plaid PFC + custom user entries
  const pfcNames = [...new Set(
    rows
      .filter((r) => r.categoryPrimary)
      .map((r) => formatPfcName(r.categoryPrimary!))
  )].sort();
  const allNewCategoryNames = [...new Set([...pfcNames, ...customCategories])].sort();

  const fetchTransactions = useCallback(async () => {
    setStep("loading");
    setError(null);
    setCustomCategories([]);
    setEditingCategoryRow(null);
    try {
      const res = await fetch("/api/plaid/transactions");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const txs: PlaidTx[] = data.transactions;

      const mapped: ImportRow[] = txs.map((tx) => {
        const pfcName = tx.categoryPrimary ? formatPfcName(tx.categoryPrimary) : "";
        return {
          _id: tx.id,
          selected: true,
          date: new Date(tx.date).toISOString().slice(0, 10),
          merchant: tx.merchantName ?? tx.name,
          amount: Math.round(Math.abs(tx.amount) * 100),
          type: inferType(tx.amount, tx.categoryPrimary),
          categoryId: null,
          categoryName: pfcName,
          isNewCategory: !!pfcName,
          categoryPrimary: tx.categoryPrimary,
          bankAccountId: null,
          notes: "",
        };
      });

      setRows(mapped);
      setStep("preview");
    } catch {
      setError("Failed to load Plaid transactions.");
      setStep("preview");
    }
  }, []);

  useEffect(() => {
    if (open) fetchTransactions();
  }, [open, fetchTransactions]);

  function handleClose() {
    onOpenChange(false);
    setRows([]);
    setStep("loading");
    setError(null);
    setCustomCategories([]);
    setEditingCategoryRow(null);
  }

  function updateRow(id: string, updates: Partial<ImportRow>) {
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...updates } : r)));
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r._id !== id));
  }

  function toggleAll(selected: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, selected })));
  }

  function handleSelectExisting(rowId: string, categoryId: string) {
    updateRow(rowId, { categoryId, categoryName: "", isNewCategory: false });
  }

  function handleSelectNew(rowId: string, name: string) {
    updateRow(rowId, { categoryId: null, categoryName: name, isNewCategory: true });
  }

  function handleCustomCategory(rowId: string, name: string) {
    if (!customCategories.includes(name) && !pfcNames.includes(name)) {
      setCustomCategories((prev) => [...prev, name]);
    }
    updateRow(rowId, { categoryId: null, categoryName: name, isNewCategory: true });
    setEditingCategoryRow(null);
  }

  const selectedRows = rows.filter((r) => r.selected);
  const missingCategory = selectedRows.some(
    (r) => !r.categoryId && !r.categoryName
  );
  const allSelected = rows.length > 0 && rows.every((r) => r.selected);

  const newCategoryCount = new Set(
    selectedRows.filter((r) => r.isNewCategory && r.categoryName).map((r) => r.categoryName)
  ).size;

  async function handleImport() {
    if (selectedRows.length === 0 || missingCategory) return;
    setStep("importing");
    setError(null);

    try {
      const res = await fetch("/api/plaid/import-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: selectedRows.map((r) => ({
            plaidTransactionId: r._id,
            merchant: r.merchant,
            amount: r.amount,
            type: r.type,
            date: r.date,
            categoryId: r.isNewCategory ? null : r.categoryId,
            categoryName: r.isNewCategory ? r.categoryName : null,
            categoryGroup: r.isNewCategory ? getGroupForPfc(r.categoryPrimary) : null,
            bankAccountId: r.bankAccountId,
            notes: r.notes || null,
          })),
        }),
      });

      if (!res.ok) throw new Error();
      handleClose();
      onImported?.();
    } catch {
      setError("Import failed. Please try again.");
      setStep("preview");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent
        className={cn(
          "p-0 gap-0 overflow-hidden transition-all duration-200",
          step === "preview" || step === "importing" ? "w-[96vw] sm:max-w-[1600px]" : ""
        )}
      >
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>
            {step === "loading" && "Loading Plaid Transactions…"}
            {step === "preview" && `Review — ${rows.length} transaction${rows.length !== 1 ? "s" : ""}`}
            {step === "importing" && "Importing…"}
          </DialogTitle>
        </DialogHeader>

        {/* ── Loading step ── */}
        {step === "loading" && (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Fetching transactions…</p>
          </div>
        )}

        {/* ── Preview step ── */}
        {step === "preview" && (
          <>
            {error && (
              <div className="border-b bg-red-50 px-6 py-2.5 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </div>
            )}

            {rows.length === 0 && !error ? (
              <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                No un-imported transactions found.
              </div>
            ) : rows.length > 0 && (
              <>
                {newCategoryCount > 0 && (
                  <div className="flex items-center gap-2 border-b bg-amber-50 px-6 py-2.5 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                    <span className="font-medium">
                      {newCategoryCount} new categor{newCategoryCount === 1 ? "y" : "ies"} will be created
                    </span>
                    <span className="text-amber-600/60 dark:text-amber-500/60">
                      — change any row to an existing category using the dropdown
                    </span>
                  </div>
                )}

                <div className="overflow-auto max-h-[58vh]">
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 z-10 border-b bg-muted/90 backdrop-blur-sm">
                      <tr>
                        <th className="px-3 py-2 text-left w-8">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={(e) => toggleAll(e.target.checked)}
                            className="cursor-pointer"
                          />
                        </th>
                        {["Date", "Merchant", "Type", "Amount", "Category", "Account", "Notes", ""].map(
                          (h) => (
                            <th
                              key={h}
                              className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap last:w-8"
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={row._id}
                          className={cn(
                            "border-b transition-colors",
                            row.selected ? "hover:bg-muted/20" : "opacity-40"
                          )}
                        >
                          <td className="px-3 py-1.5">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={(e) => updateRow(row._id, { selected: e.target.checked })}
                              className="cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-xs text-muted-foreground whitespace-nowrap">
                            {row.date}
                          </td>
                          <td className="px-3 py-1.5 min-w-[140px]">
                            <input
                              className="w-full bg-transparent text-sm outline-none hover:underline focus:underline"
                              value={row.merchant}
                              onChange={(e) => updateRow(row._id, { merchant: e.target.value })}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <select
                              className="rounded bg-background text-foreground text-xs outline-none cursor-pointer"
                              value={row.type}
                              onChange={(e) =>
                                updateRow(row._id, { type: e.target.value as "INCOME" | "EXPENSE" })
                              }
                            >
                              <option value="EXPENSE" className="bg-background text-foreground">Out</option>
                              <option value="INCOME" className="bg-background text-foreground">In</option>
                            </select>
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-24 bg-transparent text-sm outline-none text-right hover:underline focus:underline tabular-nums"
                              value={(row.amount / 100).toFixed(2)}
                              onChange={(e) =>
                                updateRow(row._id, { amount: dollarsToCents(e.target.value) })
                              }
                            />
                          </td>
                          <td className="px-3 py-1.5 min-w-[200px]">
                            {editingCategoryRow === row._id ? (
                              <InlineCategoryInput
                                onConfirm={(name) => handleCustomCategory(row._id, name)}
                                onCancel={() => setEditingCategoryRow(null)}
                              />
                            ) : (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <CategorySelect
                                  row={row}
                                  existingCategories={categories}
                                  newCategoryNames={allNewCategoryNames}
                                  onSelectExisting={(id) => handleSelectExisting(row._id, id)}
                                  onSelectNew={(name) => handleSelectNew(row._id, name)}
                                  onStartCustom={() => setEditingCategoryRow(row._id)}
                                />
                                {row.isNewCategory && row.categoryName && (
                                  <span className="shrink-0 rounded bg-amber-100 dark:bg-amber-950 px-1 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 leading-none">
                                    New
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-1.5 min-w-[130px]">
                            <select
                              className="w-full rounded bg-background text-foreground text-sm outline-none cursor-pointer"
                              value={row.bankAccountId ?? ""}
                              onChange={(e) =>
                                updateRow(row._id, { bankAccountId: e.target.value || null })
                              }
                            >
                              <option value="" className="bg-background text-foreground">No account</option>
                              {bankAccounts.map((a) => (
                                <option key={a.id} value={a.id} className="bg-background text-foreground">
                                  {a.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-1.5 min-w-[120px]">
                            <input
                              className="w-full bg-transparent text-sm text-muted-foreground outline-none hover:underline focus:underline"
                              value={row.notes}
                              placeholder="—"
                              onChange={(e) => updateRow(row._id, { notes: e.target.value })}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <button
                              onClick={() => removeRow(row._id)}
                              className="text-muted-foreground/30 hover:text-destructive transition-colors"
                            >
                              <IconX className="size-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between border-t bg-muted/20 px-6 py-3">
                  <p className="text-xs text-muted-foreground">
                    {selectedRows.length} of {rows.length} selected
                    {newCategoryCount > 0 && (
                      <span className="ml-2 text-amber-600 dark:text-amber-400">
                        · {newCategoryCount} new categor{newCategoryCount === 1 ? "y" : "ies"}
                      </span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    {error && (
                      <p className="text-xs text-destructive self-center mr-2">{error}</p>
                    )}
                    <Button variant="outline" size="sm" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleImport}
                      disabled={selectedRows.length === 0 || missingCategory}
                    >
                      Import {selectedRows.length} transaction{selectedRows.length !== 1 ? "s" : ""}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ── Importing step ── */}
        {step === "importing" && (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Importing {selectedRows.length} transaction{selectedRows.length !== 1 ? "s" : ""}…
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

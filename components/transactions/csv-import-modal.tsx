"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn, dollarsToCents, formatCurrency } from "@/lib/utils";
import { IconUpload, IconX } from "@tabler/icons-react";
import DOMPurify from "dompurify";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = { id: string; name: string; group: string };
type BankAccount = { id: string; name: string };

interface ParsedRow {
  _id: string;
  date: string;
  merchant: string;
  amount: number; // cents
  type: "INCOME" | "EXPENSE";
  notes: string;
  categoryName: string;
  categoryId: string | null;
  isNewCategory: boolean;
  bankAccountId: string | null;
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

function sanitize(s: string): string {
  return DOMPurify.sanitize(s, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

function parseDate(s: string): string {
  const t = s.trim();
  const currentYear = new Date().getFullYear();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);

  // MM/DD/YYYY
  const mdy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;

  // "Mar 1", "March 15", "Jan 01" — month name + day, no year → use current year
  const monthDay = t.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})?$/);
  if (monthDay) {
    const year = monthDay[3] ? parseInt(monthDay[3]) : currentYear;
    const d = new Date(`${monthDay[1]} ${monthDay[2]}, ${year}`);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  // Fallback: native parse, but clamp year-less results to current year
  const d = new Date(t);
  if (!isNaN(d.getTime())) {
    // If year looks wrong (e.g. 2001 from "Mar 1"), replace with current year
    if (d.getFullYear() < 2000) {
      d.setFullYear(currentYear);
    }
    return d.toISOString().slice(0, 10);
  }

  return t;
}

function parseAmount(s: string): number {
  const n = parseFloat(s.replace(/[$,\s]/g, ""));
  return isNaN(n) ? 0 : Math.round(Math.abs(n) * 100);
}

function parseType(s: string): "INCOME" | "EXPENSE" {
  const v = s.trim().toLowerCase();
  return ["in", "inflow", "income", "credit", "cr", "+", "deposit", "1", "true"].includes(v)
    ? "INCOME"
    : "EXPENSE";
}

// ── Category selector ─────────────────────────────────────────────────────────

function CategorySelect({
  row,
  categories,
  onChange,
}: {
  row: ParsedRow;
  categories: Category[];
  onChange: (categoryId: string | null, isNew: boolean) => void;
}) {
  const byGroup = GROUP_ORDER.reduce<Record<string, Category[]>>((acc, g) => {
    acc[g] = categories.filter((c) => c.group === g);
    return acc;
  }, {});

  const value = row.categoryId ?? `__new__:${row.categoryName}`;

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <select
        className="min-w-0 flex-1 bg-transparent text-sm outline-none cursor-pointer"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          if (v.startsWith("__new__:")) onChange(null, true);
          else onChange(v, false);
        }}
      >
        {row.isNewCategory && row.categoryId === null && (
          <optgroup label="— Create new">
            <option value={`__new__:${row.categoryName}`}>
              + {row.categoryName}
            </option>
          </optgroup>
        )}
        {GROUP_ORDER.map((g) =>
          byGroup[g]?.length ? (
            <optgroup key={g} label={GROUP_LABELS[g]}>
              {byGroup[g].map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ) : null
        )}
      </select>
      {row.categoryId === null && (
        <span className="shrink-0 rounded bg-amber-100 dark:bg-amber-950 px-1 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 leading-none">
          New
        </span>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function CsvImportModal({
  categories,
  bankAccounts,
}: {
  categories: Category[];
  bankAccounts: BankAccount[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "importing">("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("upload");
    setRows([]);
    setParseError(null);
    setImportError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(o: boolean) {
    setOpen(o);
    if (!o) reset();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""),
      complete: (results) => {
        if (results.data.length === 0) {
          setParseError("The CSV file is empty.");
          return;
        }

        const keys = Object.keys(results.data[0]);
        const col = (needles: string[]) =>
          keys.find((k) => needles.some((n) => k.includes(n))) ?? needles[0];

        const dateKey = col(["date"]);
        const descKey = col(["desc", "merchant", "payee", "name"]);
        const catKey = col(["cat"]);
        const amtKey = col(["amount", "amt"]);
        const typeKey = col(["inout", "type", "direction", "credit", "debit"]);
        const noteKey = col(["note", "memo"]);

        const parsed: ParsedRow[] = results.data.map((row, i) => {
          const categoryName = sanitize(row[catKey] ?? "");
          const merchant = sanitize(row[descKey] ?? "");
          const notes = sanitize(row[noteKey] ?? "");
          const date = parseDate(sanitize(row[dateKey] ?? ""));
          const amount = parseAmount(sanitize(row[amtKey] ?? "0"));
          const type = parseType(sanitize(row[typeKey] ?? "out"));

          const matched = categories.find(
            (c) => c.name.toLowerCase() === categoryName.toLowerCase()
          );

          return {
            _id: `r${i}`,
            date,
            merchant,
            amount,
            type,
            notes,
            categoryName,
            categoryId: matched?.id ?? null,
            isNewCategory: !matched,
            bankAccountId: null,
          };
        });

        setRows(parsed);
        setStep("preview");
      },
      error: (err) => setParseError(`Failed to parse: ${err.message}`),
    });
  }

  function updateRow(id: string, updates: Partial<ParsedRow>) {
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...updates } : r)));
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r._id !== id));
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setStep("importing");
    setImportError(null);

    try {
      const res = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: rows.map((r) => ({
            date: r.date,
            merchant: r.merchant,
            amount: r.amount,
            type: r.type,
            notes: r.notes || null,
            bankAccountId: r.bankAccountId || null,
            categoryId: r.categoryId,
            categoryName: r.categoryName,
          })),
        }),
      });

      if (!res.ok) throw new Error();
      setOpen(false);
      router.refresh();
    } catch {
      setImportError("Import failed. Please try again.");
      setStep("preview");
    }
  }

  const newCount = rows.filter((r) => r.categoryId === null).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <IconUpload className="size-3.5" />
          Import CSV
        </Button>
      </DialogTrigger>

      <DialogContent
        className={cn(
          "p-0 gap-0 overflow-hidden transition-all duration-200",
          step === "preview" || step === "importing" ? "w-[92vw] max-w-7xl" : "max-w-lg"
        )}
      >
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>
            {step === "upload" && "Import Transactions from CSV"}
            {step === "preview" && `Preview — ${rows.length} transaction${rows.length !== 1 ? "s" : ""}`}
            {step === "importing" && "Importing…"}
          </DialogTitle>
        </DialogHeader>

        {/* ── Upload step ── */}
        {step === "upload" && (
          <div className="p-6 flex flex-col gap-4">
            <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-3">
              <p className="font-medium text-xs uppercase tracking-wider text-muted-foreground">
                Expected CSV format
              </p>
              <code className="block rounded border bg-background px-3 py-2 font-mono text-xs">
                Date,Description,Category,Amount,In/Out,Notes
              </code>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li><span className="font-medium text-foreground">Date</span> — YYYY-MM-DD or MM/DD/YYYY</li>
                <li><span className="font-medium text-foreground">Description</span> — Merchant or payee name</li>
                <li><span className="font-medium text-foreground">Category</span> — Matched to existing categories by name, or a new one will be created</li>
                <li><span className="font-medium text-foreground">Amount</span> — Positive number (e.g. <code>12.50</code> or <code>$1,200.00</code>)</li>
                <li><span className="font-medium text-foreground">In/Out</span> — <code>In</code> for income, <code>Out</code> for expense</li>
                <li><span className="font-medium text-foreground">Notes</span> — Optional</li>
              </ul>
            </div>

            {parseError && (
              <p className="text-sm text-destructive">{parseError}</p>
            )}

            <button
              type="button"
              className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-8 py-10 text-center transition-colors hover:border-primary/50 hover:bg-muted/20 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file && fileInputRef.current) {
                  const dt = new DataTransfer();
                  dt.items.add(file);
                  fileInputRef.current.files = dt.files;
                  fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
                }
              }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <IconUpload className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Click to select a CSV file</p>
                <p className="text-xs text-muted-foreground mt-0.5">or drag and drop</p>
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        )}

        {/* ── Preview step ── */}
        {step === "preview" && (
          <>
            {newCount > 0 && (
              <div className="flex items-center gap-2 border-b bg-amber-50 px-6 py-2.5 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                <span className="font-medium">
                  {newCount} new categor{newCount === 1 ? "y" : "ies"} will be created
                </span>
                <span className="text-amber-600/60 dark:text-amber-500/60">
                  — reassign any row to an existing category using the dropdown
                </span>
              </div>
            )}

            <div className="overflow-auto max-h-[58vh]">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10 border-b bg-muted/90 backdrop-blur-sm">
                  <tr>
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
                    <tr key={row._id} className="border-b hover:bg-muted/20 transition-colors">
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
                          className="bg-transparent text-xs outline-none cursor-pointer"
                          value={row.type}
                          onChange={(e) =>
                            updateRow(row._id, {
                              type: e.target.value as "INCOME" | "EXPENSE",
                            })
                          }
                        >
                          <option value="EXPENSE">Out</option>
                          <option value="INCOME">In</option>
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
                            updateRow(row._id, {
                              amount: dollarsToCents(e.target.value),
                            })
                          }
                        />
                      </td>
                      <td className="px-3 py-1.5 min-w-[180px]">
                        <CategorySelect
                          row={row}
                          categories={categories}
                          onChange={(categoryId, isNew) =>
                            updateRow(row._id, { categoryId, isNewCategory: isNew })
                          }
                        />
                      </td>
                      <td className="px-3 py-1.5 min-w-[130px]">
                        <select
                          className="w-full bg-transparent text-sm outline-none cursor-pointer text-muted-foreground"
                          value={row.bankAccountId ?? ""}
                          onChange={(e) =>
                            updateRow(row._id, {
                              bankAccountId: e.target.value || null,
                            })
                          }
                        >
                          <option value="">No account</option>
                          {bankAccounts.map((a) => (
                            <option key={a.id} value={a.id}>
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
                {rows.length} transaction{rows.length !== 1 ? "s" : ""}
                {newCount > 0 && (
                  <span className="ml-2 text-amber-600 dark:text-amber-400">
                    · {newCount} new categor{newCount === 1 ? "y" : "ies"}
                  </span>
                )}
              </p>
              <div className="flex gap-2">
                {importError && (
                  <p className="text-xs text-destructive self-center mr-2">{importError}</p>
                )}
                <Button variant="outline" size="sm" onClick={reset}>
                  Back
                </Button>
                <Button size="sm" onClick={handleImport} disabled={rows.length === 0}>
                  Import {rows.length} transaction{rows.length !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ── Importing step ── */}
        {step === "importing" && (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Importing {rows.length} transaction{rows.length !== 1 ? "s" : ""}…
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

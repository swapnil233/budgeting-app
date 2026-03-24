"use client";

import { Button } from "@/components/ui/button";
import { dollarsToCents, formatCurrency } from "@/lib/utils";
import { Fragment } from "react";
import { IconCheck, IconPencil, IconTrash, IconX } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Category = {
  id: string;
  name: string;
  group: string;
  budgetAmount: number;
};

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

const cellInput =
  "w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm outline-none focus:border-ring focus:bg-background focus:ring-1 focus:ring-ring transition-colors placeholder:text-muted-foreground/50";
const cellSelect =
  "w-full rounded border border-transparent bg-transparent px-1 py-1 text-sm outline-none focus:border-ring focus:bg-background focus:ring-1 focus:ring-ring transition-colors cursor-pointer";

// ── Add row ──────────────────────────────────────────────────────────────────

function AddRow() {
  const router = useRouter();
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
      nameRef.current?.focus();
      router.refresh();
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
    <>
      <tr className="border-b bg-muted/30 hover:bg-muted/40" onKeyDown={handleKeyDown}>
        <td className="px-2 py-1.5">
          <input
            ref={nameRef}
            type="text"
            className={cellInput}
            placeholder="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </td>
        <td className="px-2 py-1.5">
          <select className={cellSelect} value={group} onChange={(e) => setGroup(e.target.value)}>
            {GROUP_ORDER.map((g) => (
              <option key={g} value={g}>{GROUP_LABELS[g]}</option>
            ))}
          </select>
        </td>
        <td className="px-2 py-1.5">
          <input
            type="number"
            min="0"
            step="0.01"
            className={`${cellInput} text-right`}
            placeholder="No limit"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </td>
        <td className="px-2 py-1.5">
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost"
              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={save} disabled={saving} title="Save (Enter)">
              <IconCheck className="size-4" />
            </Button>
            <Button size="icon" variant="ghost"
              className="h-7 w-7 text-muted-foreground"
              onClick={reset} title="Clear (Esc)">
              <IconX className="size-4" />
            </Button>
          </div>
        </td>
      </tr>
      {error && (
        <tr className="bg-destructive/5">
          <td colSpan={4} className="px-3 py-1 text-xs text-destructive">{error}</td>
        </tr>
      )}
    </>
  );
}

// ── Budget cell — click to edit inline ───────────────────────────────────────

function BudgetCell({ category }: { category: Category }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(
    category.budgetAmount > 0 ? (category.budgetAmount / 100).toFixed(2) : ""
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
      router.refresh();
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
      className="group flex items-center gap-1.5 text-sm tabular-nums hover:text-foreground transition-colors"
      onClick={() => { setEditing(true); }}
      title="Click to edit"
    >
      <span className={category.budgetAmount > 0 ? "" : "text-muted-foreground/50"}>
        {category.budgetAmount > 0 ? formatCurrency(category.budgetAmount) : "No limit"}
      </span>
      <IconPencil className="size-3 opacity-0 group-hover:opacity-40 transition-opacity" />
    </button>
  );
}

// ── Main table ────────────────────────────────────────────────────────────────

export function CategoriesTable({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? Transactions in this category will also be deleted.`)) return;
    setDeletingId(id);
    try {
      await fetch(`/api/categories/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  const byGroup = GROUP_ORDER.reduce<Record<string, Category[]>>((acc, g) => {
    acc[g] = categories.filter((c) => c.group === g);
    return acc;
  }, {});

  const totalBudget = categories.reduce((s, c) => s + c.budgetAmount, 0);

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left">
            <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Name</th>
            <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Group</th>
            <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider text-right">Monthly Budget</th>
            <th className="px-3 py-2.5 w-20" />
          </tr>
        </thead>
        <tbody>
          <AddRow />

          {categories.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
                No categories yet. Add one above.
              </td>
            </tr>
          ) : (
            GROUP_ORDER.map((group) => {
              const rows = byGroup[group];
              if (!rows || rows.length === 0) return null;
              return (
                <Fragment key={group}>
                  <tr className="border-t bg-muted/30">
                    <td colSpan={4} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {GROUP_LABELS[group]}
                    </td>
                  </tr>
                  {rows.map((cat) => (
                    <tr key={cat.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5 font-medium">{cat.name}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{GROUP_LABELS[cat.group]}</td>
                      <td className="px-3 py-2.5 text-right">
                        <BudgetCell category={cat} />
                      </td>
                      <td className="px-3 py-2.5">
                        <Button variant="ghost" size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(cat.id, cat.name)}
                          disabled={deletingId === cat.id}>
                          <IconTrash className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>

      {categories.length > 0 && (
        <div className="border-t px-3 py-2 flex items-center justify-between text-xs text-muted-foreground bg-muted/20">
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

"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CategoryDialog } from "@/components/categories/category-dialog";
import { GROUP_ORDER, GROUP_LABELS } from "@/lib/ag-grid";
import { DEFAULT_COLOUR } from "@/lib/category-colours";
import { formatCurrency, cn } from "@/lib/utils";
import {
  IconFolder,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Category = {
  id: string;
  name: string;
  group: string;
  colour: string | null;
  budgetAmount: number;
};

// ── Category row ─────────────────────────────────────────────────────────────

function CategoryRow({
  category,
  onEdit,
  onDelete,
  isLast,
}: {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
  isLast: boolean;
}) {
  const colour = category.colour ?? DEFAULT_COLOUR;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40",
        !isLast && "border-b",
      )}
    >
      {/* Colour accent bar */}
      <div
        className="h-5 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: colour }}
      />

      {/* Name */}
      <span className="flex-1 text-sm font-medium">{category.name}</span>

      {/* Budget */}
      <span
        className={cn(
          "shrink-0 text-sm tabular-nums",
          category.budgetAmount > 0
            ? "font-medium text-foreground"
            : "text-muted-foreground/40",
        )}
      >
        {category.budgetAmount > 0
          ? formatCurrency(category.budgetAmount) + "/mo"
          : "—"}
      </span>

      {/* Actions — reveal on hover */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
          title="Edit"
        >
          <IconPencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          title="Delete"
        >
          <IconTrash className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Group card ────────────────────────────────────────────────────────────────

function GroupCard({
  group,
  categories,
  onEdit,
  onDelete,
}: {
  group: string;
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}) {
  const subtotal = categories.reduce((s, c) => s + c.budgetAmount, 0);

  return (
    <div className="overflow-hidden rounded-xl border">
      {/* Group header */}
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-2.5">
        <h2 className="font-semibold">{GROUP_LABELS[group]}</h2>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground border">
          {categories.length}
        </span>
        {subtotal > 0 && (
          <span className="ml-auto text-sm tabular-nums font-medium text-muted-foreground">
            {formatCurrency(subtotal)}/mo
          </span>
        )}
      </div>

      {/* Category rows */}
      <div>
        {categories.map((cat, i) => (
          <CategoryRow
            key={cat.id}
            category={cat}
            onEdit={() => onEdit(cat)}
            onDelete={() => onDelete(cat)}
            isLast={i === categories.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

export function CategoriesPageClient({
  categories,
}: {
  categories: Category[];
}) {
  const router = useRouter();
  const [dialogState, setDialogState] = useState<null | "create" | Category>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const totalBudget = categories.reduce((s, c) => s + c.budgetAmount, 0);
  const groupsWithCategories = GROUP_ORDER.filter((g) =>
    categories.some((c) => c.group === g),
  );

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/categories/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Categories</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Organise your spending into groups and set monthly budgets.
          </p>
        </div>
        <Button onClick={() => setDialogState("create")}>
          <IconPlus className="size-4" />
          Add Category
        </Button>
      </div>

      {/* Summary strip */}
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
          <span>{categories.length} categories</span>
          <span className="mx-2 opacity-30">·</span>
          <span>
            {totalBudget > 0 ? (
              <>
                <span className="font-medium text-foreground">
                  {formatCurrency(totalBudget)}
                </span>
                /mo budgeted
              </>
            ) : (
              "No budgets set"
            )}
          </span>
          <span className="mx-2 opacity-30">·</span>
          <span>{groupsWithCategories.length} groups</span>
        </div>
      )}

      {/* Group cards or empty state */}
      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
            <IconFolder className="size-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">No categories yet</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Categories help you organise spending and track budgets. Add your
            first one to get started.
          </p>
          <Button className="mt-5" onClick={() => setDialogState("create")}>
            <IconPlus className="size-4" />
            Create your first category
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groupsWithCategories.map((g) => (
            <GroupCard
              key={g}
              group={g}
              categories={categories.filter((c) => c.group === g)}
              onEdit={(cat) => setDialogState(cat)}
              onDelete={(cat) => setDeleteTarget(cat)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <CategoryDialog
        mode={dialogState === "create" ? "create" : "edit"}
        category={
          dialogState !== null && dialogState !== "create"
            ? dialogState
            : undefined
        }
        open={dialogState !== null}
        onOpenChange={(open) => {
          if (!open) setDialogState(null);
        }}
        onSuccess={() => router.refresh()}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &ldquo;{deleteTarget?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this category and all transactions
              associated with it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting\u2026" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

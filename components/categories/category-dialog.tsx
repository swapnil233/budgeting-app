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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { GROUP_ORDER, GROUP_LABELS } from "@/lib/ag-grid";
import { CATEGORY_COLOURS, DEFAULT_COLOUR } from "@/lib/category-colours";
import { dollarsToCents, cn } from "@/lib/utils";
import { IconCheck } from "@tabler/icons-react";
import { useState, useEffect } from "react";

type Category = {
  id: string;
  name: string;
  group: string;
  colour: string | null;
  budgetAmount: number;
};

interface CategoryDialogProps {
  mode: "create" | "edit";
  category?: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CategoryDialog({
  mode,
  category,
  open,
  onOpenChange,
  onSuccess,
}: CategoryDialogProps) {
  const [name, setName] = useState("");
  const [group, setGroup] = useState("FIXED");
  const [budget, setBudget] = useState("");
  const [colour, setColour] = useState<string>(CATEGORY_COLOURS[8].value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      if (mode === "edit" && category) {
        setName(category.name);
        setGroup(category.group);
        setBudget(
          category.budgetAmount > 0
            ? (category.budgetAmount / 100).toFixed(2)
            : "",
        );
        setColour(category.colour ?? DEFAULT_COLOUR);
      } else {
        setName("");
        setGroup("FIXED");
        setBudget("");
        setColour(CATEGORY_COLOURS[8].value);
      }
      setError(null);
    }
  }, [open, mode, category]);

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url =
        mode === "edit" ? `/api/categories/${category!.id}` : "/api/categories";
      const res = await fetch(url, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          group,
          colour,
          budgetAmount: budget ? dollarsToCents(budget) : 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to save category.");
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!category) return;
    setDeleting(true);
    try {
      await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
      setShowDeleteAlert(false);
      onOpenChange(false);
      onSuccess();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "New Category" : "Edit Category"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                placeholder="e.g. Groceries"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cat-group">Group</Label>
              <Select value={group} onValueChange={setGroup}>
                <SelectTrigger id="cat-group">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_ORDER.map((g) => (
                    <SelectItem key={g} value={g}>
                      {GROUP_LABELS[g]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cat-budget">Monthly Budget</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="cat-budget"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty for no budget limit.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Colour</Label>
              <div className="grid grid-cols-8 gap-2">
                {CATEGORY_COLOURS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full transition-all",
                      colour === c.value
                        ? "ring-2 ring-offset-2 ring-foreground ring-offset-background"
                        : "hover:scale-110",
                    )}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setColour(c.value)}
                    title={c.label}
                  >
                    {colour === c.value && (
                      <IconCheck className="size-3.5 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter className="flex-row gap-2">
            {mode === "edit" && (
              <Button
                variant="destructive"
                size="sm"
                className="mr-auto"
                onClick={() => setShowDeleteAlert(true)}
              >
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!name.trim() || !group || saving}
            >
              {saving ? "Saving\u2026" : mode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{category?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this category and all transactions
              associated with it. This action cannot be undone.
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

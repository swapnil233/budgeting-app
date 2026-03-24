"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dollarsToCents } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
};

interface TransactionFormProps {
  categories: Category[];
  bankAccounts: BankAccount[];
  transaction?: Transaction;
  onSuccess: () => void;
}

export function TransactionForm({
  categories,
  bankAccounts,
  transaction,
  onSuccess,
}: TransactionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultDate = transaction
    ? new Date(transaction.date).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    const payload = {
      type: data.get("type") as string,
      merchant: data.get("merchant") as string,
      amount: dollarsToCents(data.get("amount") as string),
      notes: (data.get("notes") as string) || null,
      review: data.get("review") === "on",
      date: data.get("date") as string,
      categoryId: data.get("categoryId") as string,
      bankAccountId: data.get("bankAccountId") as string,
    };

    try {
      const url = transaction
        ? `/api/transactions/${transaction.id}`
        : "/api/transactions";
      const method = transaction ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save transaction");

      router.refresh();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const groupOrder = ["FIXED", "SUBSCRIPTIONS", "FOOD", "LIFESTYLE", "PEOPLE_AND_PETS", "OTHER"];
  const groupLabels: Record<string, string> = {
    FIXED: "Fixed",
    SUBSCRIPTIONS: "Subscriptions",
    FOOD: "Food",
    LIFESTYLE: "Lifestyle",
    PEOPLE_AND_PETS: "People & Pets",
    OTHER: "Other",
  };

  const categoriesByGroup = groupOrder.reduce<Record<string, Category[]>>((acc, group) => {
    acc[group] = categories.filter((c) => c.group === group);
    return acc;
  }, {});

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" defaultValue={defaultDate} required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="type">Type</Label>
        <Select name="type" defaultValue={transaction?.type ?? "EXPENSE"} required>
          <SelectTrigger id="type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EXPENSE">Expense</SelectItem>
            <SelectItem value="INCOME">Income</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="merchant">Merchant</Label>
        <Input
          id="merchant"
          name="merchant"
          placeholder="e.g. Loblaws"
          defaultValue={transaction?.merchant ?? ""}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="amount">Amount ($)</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          defaultValue={transaction ? (transaction.amount / 100).toFixed(2) : ""}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="categoryId">Category</Label>
        <Select name="categoryId" defaultValue={transaction?.categoryId ?? ""} required>
          <SelectTrigger id="categoryId">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {groupOrder.map((group) =>
              categoriesByGroup[group]?.length > 0 ? (
                <div key={group}>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {groupLabels[group]}
                  </div>
                  {categoriesByGroup[group].map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </div>
              ) : null
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="bankAccountId">Bank Account</Label>
        <Select name="bankAccountId" defaultValue={transaction?.bankAccountId ?? ""} required>
          <SelectTrigger id="bankAccountId">
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {bankAccounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          name="notes"
          placeholder="Optional notes"
          defaultValue={transaction?.notes ?? ""}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="review"
          name="review"
          defaultChecked={transaction?.review ?? false}
          className="h-4 w-4 rounded border"
        />
        <Label htmlFor="review">Flag for review</Label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : transaction ? "Update Transaction" : "Add Transaction"}
      </Button>
    </form>
  );
}

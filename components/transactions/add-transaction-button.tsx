"use client";

import { TransactionForm } from "./transaction-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";

type Category = { id: string; name: string; group: string };
type BankAccount = { id: string; name: string };

interface AddTransactionButtonProps {
  categories: Category[];
  bankAccounts: BankAccount[];
}

export function AddTransactionButton({ categories, bankAccounts }: AddTransactionButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <IconPlus className="size-4" />
          Add Transaction
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Transaction</SheetTitle>
        </SheetHeader>
        <TransactionForm
          categories={categories}
          bankAccounts={bankAccounts}
          onSuccess={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

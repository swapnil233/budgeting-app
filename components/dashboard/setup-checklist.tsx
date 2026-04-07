"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectBankButton } from "@/components/plaid/ConnectBankButton";
import { cn } from "@/lib/utils";
import { IconCheck, IconListCheck } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface SetupChecklistProps {
  items: ChecklistItem[];
}

export function SetupChecklist({ items }: SetupChecklistProps) {
  const router = useRouter();
  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;

  return (
    <Card className="flex flex-col gap-0 py-0 overflow-hidden">
      <CardHeader className="px-5 py-4 gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <IconListCheck className="size-5 text-primary" />
            </div>
            <CardTitle className="text-base font-semibold">Get Started</CardTitle>
          </div>
          <span className="text-sm text-muted-foreground">
            {completedCount} of {totalCount} complete
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(completedCount / totalCount) * 100}%`,
              background:
                "linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7, #d946ef, #ec4899)",
            }}
          />
        </div>
      </CardHeader>

      <CardContent className="px-5 py-0 pb-2">
        <div className="divide-y">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-start gap-3 py-4">
              <div
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  item.completed
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-muted-foreground/30"
                )}
              >
                {item.completed && <IconCheck className="size-3.5" />}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    item.completed && "line-through text-muted-foreground"
                  )}
                >
                  {index + 1}. {item.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.description}
                </p>

                {!item.completed && item.id === "link-bank" && (
                  <div className="mt-2">
                    <ConnectBankButton
                      onSuccess={() => router.refresh()}
                    />
                  </div>
                )}

                {!item.completed && item.id === "import-transactions" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    asChild
                  >
                    <Link href="/dashboard/accounts">
                      Go to Accounts
                    </Link>
                  </Button>
                )}

                {!item.completed && item.id === "setup-budgets" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    asChild
                  >
                    <Link href="/dashboard/budgets">
                      Go to Budgets
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

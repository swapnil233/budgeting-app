"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMemo } from "react";
import { CashFlowTab } from "./cash-flow-tab";
import { IncomeTab } from "./income-tab";
import { deriveReportsData, type Category, type Tx } from "./reports-data";
import { SpendingTab } from "./spending-tab";

interface ReportsTabsProps {
  transactions: Tx[];
  categories: Category[];
}

export function ReportsTabs({ transactions, categories }: ReportsTabsProps) {
  const data = useMemo(() => deriveReportsData(transactions), [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-32 text-sm text-muted-foreground">
        No transactions yet — import or add some to see reports.
      </div>
    );
  }

  return (
    <Tabs defaultValue="cashflow">
      <TabsList className="mb-4">
        <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
        <TabsTrigger value="spending">Spending</TabsTrigger>
        <TabsTrigger value="income">Income</TabsTrigger>
      </TabsList>

      <TabsContent value="cashflow" className="mt-0">
        <CashFlowTab data={data} />
      </TabsContent>

      <TabsContent value="spending" className="mt-0">
        <SpendingTab data={data} />
      </TabsContent>

      <TabsContent value="income" className="mt-0">
        <IncomeTab data={data} />
      </TabsContent>
    </Tabs>
  );
}

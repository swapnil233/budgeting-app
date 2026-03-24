// Shared types + data-derivation for the reports page

export type TxCategory = {
  id: string;
  name: string;
  group: string;
  budgetAmount: number;
};

export type Tx = {
  id: string;
  type: "INCOME" | "EXPENSE";
  merchant: string;
  amount: number;
  date: string;
  notes: string | null;
  category: TxCategory;
};

export type Category = {
  id: string;
  name: string;
  group: string;
  budgetAmount: number;
};

export const EXPENSE_GROUPS = [
  "FIXED",
  "SUBSCRIPTIONS",
  "FOOD",
  "LIFESTYLE",
  "PEOPLE_AND_PETS",
  "OTHER",
] as const;

export const GROUP_LABELS: Record<string, string> = {
  INCOME: "Income",
  FIXED: "Fixed",
  SUBSCRIPTIONS: "Subscriptions",
  FOOD: "Food",
  LIFESTYLE: "Lifestyle",
  PEOPLE_AND_PETS: "People & Pets",
  OTHER: "Other",
};

export const GROUP_COLORS: Record<string, string> = {
  INCOME: "#22c55e",
  FIXED: "#6366f1",
  SUBSCRIPTIONS: "#a855f7",
  FOOD: "#f97316",
  LIFESTYLE: "#ec4899",
  PEOPLE_AND_PETS: "#06b6d4",
  OTHER: "#94a3b8",
};

export const INCOME_CAT_COLORS = [
  "#16a34a",
  "#22c55e",
  "#4ade80",
  "#86efac",
  "#bbf7d0",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return new Date(+y, +m - 1).toLocaleDateString("en-CA", {
    month: "short",
    year: "2-digit",
  });
}

// ── Derived data ──────────────────────────────────────────────────────────────

export function deriveReportsData(transactions: Tx[]) {
  const income = transactions.filter((t) => t.type === "INCOME");
  const expenses = transactions.filter((t) => t.type === "EXPENSE");

  const totalIncome = income.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((net / totalIncome) * 100) : 0;

  // ── Monthly totals ──────────────────────────────────────────────────────────
  const monthMap = new Map<string, { income: number; expense: number }>();
  for (const t of transactions) {
    const k = monthKey(t.date);
    const cur = monthMap.get(k) ?? { income: 0, expense: 0 };
    if (t.type === "INCOME") cur.income += t.amount;
    else cur.expense += t.amount;
    monthMap.set(k, cur);
  }
  const monthlyData = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => ({
      month: monthLabel(k),
      income: v.income,
      expense: v.expense,
      net: v.income - v.expense,
    }));

  // ── Spending by group ───────────────────────────────────────────────────────
  const groupMap = new Map<string, number>();
  for (const t of expenses) {
    groupMap.set(t.category.group, (groupMap.get(t.category.group) ?? 0) + t.amount);
  }
  const spendByGroup = EXPENSE_GROUPS.map((g) => ({
    group: g,
    name: GROUP_LABELS[g],
    amount: groupMap.get(g) ?? 0,
    color: GROUP_COLORS[g],
    pct: totalExpenses > 0 ? Math.round(((groupMap.get(g) ?? 0) / totalExpenses) * 100) : 0,
  })).filter((g) => g.amount > 0);

  // ── Top categories by spend ─────────────────────────────────────────────────
  const catMap = new Map<string, { name: string; group: string; amount: number }>();
  for (const t of expenses) {
    const cur = catMap.get(t.category.id) ?? {
      name: t.category.name,
      group: t.category.group,
      amount: 0,
    };
    cur.amount += t.amount;
    catMap.set(t.category.id, cur);
  }
  const topCategories = [...catMap.entries()]
    .map(([id, v]) => ({ id, ...v, pct: totalExpenses > 0 ? Math.round((v.amount / totalExpenses) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 12);

  // ── Income by category ──────────────────────────────────────────────────────
  const incomeMap = new Map<string, { name: string; amount: number }>();
  for (const t of income) {
    const cur = incomeMap.get(t.category.id) ?? { name: t.category.name, amount: 0 };
    cur.amount += t.amount;
    incomeMap.set(t.category.id, cur);
  }
  const incomeByCategory = [...incomeMap.entries()]
    .map(([id, v]) => ({
      id,
      ...v,
      pct: totalIncome > 0 ? Math.round((v.amount / totalIncome) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // ── Income source names (for stacked bar keys) ──────────────────────────────
  const incomeCatNames = incomeByCategory.map((c) => c.name);

  // ── Monthly income by category (stacked bar) ────────────────────────────────
  const incomeMonthMap = new Map<string, Record<string, number>>();
  for (const t of income) {
    const k = monthKey(t.date);
    const cur = incomeMonthMap.get(k) ?? {};
    cur[t.category.name] = (cur[t.category.name] ?? 0) + t.amount;
    incomeMonthMap.set(k, cur);
  }
  const monthlyIncomeData = [...incomeMonthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, cats]) => ({ month: monthLabel(k), ...cats }));

  // ── Income source flows (for cash flow visualization) ──────────────────────
  const incomeFlows = incomeByCategory.slice(0, 6);
  const expenseFlows = EXPENSE_GROUPS.map((g) => ({
    name: GROUP_LABELS[g],
    group: g,
    amount: groupMap.get(g) ?? 0,
    color: GROUP_COLORS[g],
  })).filter((g) => g.amount > 0);

  // ── Summary stats ───────────────────────────────────────────────────────────
  const amounts = transactions.map((t) => t.amount);
  const largest = income.length ? Math.max(...income.map((t) => t.amount)) : 0;
  const avgIncome = income.length ? Math.round(totalIncome / income.length) : 0;

  const dates = transactions.map((t) => new Date(t.date));
  const firstDate = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
  const lastDate = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;

  return {
    income,
    expenses,
    totalIncome,
    totalExpenses,
    net,
    savingsRate,
    monthlyData,
    spendByGroup,
    topCategories,
    incomeByCategory,
    incomeCatNames,
    monthlyIncomeData,
    incomeFlows,
    expenseFlows,
    stats: {
      totalTxns: transactions.length,
      incomeTxns: income.length,
      largest,
      avgIncome,
      firstDate,
      lastDate,
    },
  };
}

export type ReportsData = ReturnType<typeof deriveReportsData>;

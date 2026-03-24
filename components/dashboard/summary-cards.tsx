import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface SummaryCardsProps {
  totalInflow: number;
  totalExpenses: number;
  netPosition: number;
  categoriesOverBudget: number;
}

export function SummaryCards({
  totalInflow,
  totalExpenses,
  netPosition,
  categoriesOverBudget,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Total Inflow</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalInflow)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Total Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Net Position</CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              "text-2xl font-bold",
              netPosition >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {formatCurrency(netPosition)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Over Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              "text-2xl font-bold",
              categoriesOverBudget === 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {categoriesOverBudget}{" "}
            <span className="text-sm font-normal text-muted-foreground">categories</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

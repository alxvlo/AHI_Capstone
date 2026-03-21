import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardTone = "default" | "positive" | "warning" | "danger";

type MetricCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: MetricCardTone;
};

const toneClasses: Record<MetricCardTone, string> = {
  default: "border-border",
  positive: "border-emerald-300/70 bg-emerald-50/40",
  warning: "border-amber-300/70 bg-amber-50/40",
  danger: "border-rose-300/70 bg-rose-50/40",
};

export function MetricCard({
  label,
  value,
  hint,
  tone = "default",
}: MetricCardProps) {
  return (
    <Card className={cn("shadow-sm", toneClasses[tone])}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

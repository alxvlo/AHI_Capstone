import { cn } from "@/lib/utils";

type StatusBadgeTone = "neutral" | "positive" | "warning" | "danger";

type StatusBadgeProps = {
  label: string;
  tone?: StatusBadgeTone;
};

const toneClasses: Record<StatusBadgeTone, string> = {
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
  positive: "border-emerald-200 bg-emerald-100 text-emerald-700",
  warning: "border-amber-200 bg-amber-100 text-amber-700",
  danger: "border-rose-200 bg-rose-100 text-rose-700",
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        toneClasses[tone]
      )}
    >
      {label}
    </span>
  );
}

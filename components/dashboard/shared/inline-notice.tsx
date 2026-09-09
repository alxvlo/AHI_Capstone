import { cn } from "@/lib/utils";

type InlineNoticeProps = {
  tone: "positive" | "danger";
  message: string | undefined;
};

// Class tokens are pinned by tests/e2e/staff-dashboard.spec.ts:141,148.
const TONE = {
  positive: { className: "border-emerald-300/70 bg-emerald-50/40 text-emerald-900", role: "status" },
  danger: { className: "border-rose-300/70 bg-rose-50/40 text-rose-900", role: "alert" },
} as const;

export function InlineNotice({ tone, message }: InlineNoticeProps) {
  if (!message) return null;
  const t = TONE[tone];
  return (
    <div role={t.role} className={cn("rounded-lg border px-4 py-3 text-sm", t.className)}>
      {message}
    </div>
  );
}

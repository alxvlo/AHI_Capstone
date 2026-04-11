import Link from "next/link";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/ui/button";

type DpaNoticeProps = {
  acknowledged: boolean;
  acknowledgeHref: string;
};

export function DpaNotice({ acknowledged, acknowledgeHref }: DpaNoticeProps) {
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Data Privacy Notice</h2>
        <StatusBadge
          label={acknowledged ? "Acknowledged" : "Required"}
          tone={acknowledged ? "positive" : "warning"}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        Access to case fitness summaries is governed by the Data Privacy Act. Only released
        cases with verified waiver consent are visible, and only compliance-safe summary
        fields are displayed.
      </p>

      {!acknowledged ? (
        <div className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          You must acknowledge this notice before viewing fitness summaries.
        </div>
      ) : null}

      <Button className="h-11 px-4" asChild>
        <Link href={acknowledgeHref}>
          {acknowledged ? "DPA Notice Acknowledged" : "Acknowledge DPA Notice"}
        </Link>
      </Button>
    </section>
  );
}

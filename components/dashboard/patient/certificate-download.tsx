import { requestCertificateDownloadAction } from "@/features/dashboard/patient/actions";
import {
  formatTimestamp,
  isCaseReleased,
} from "@/features/dashboard/patient/shared";
import { Button } from "@/components/ui/button";

type CertificateDownloadProps = {
  caseId: string;
  caseNumber: string;
  statusCode: string | null;
  releasedAt: string | null;
  returnPath: string;
  flashNotice?: string;
  flashError?: string;
};

export function CertificateDownload({
  caseId,
  caseNumber,
  statusCode,
  releasedAt,
  returnPath,
  flashNotice = "",
  flashError = "",
}: CertificateDownloadProps) {
  if (!isCaseReleased(statusCode)) {
    return (
      <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">PDF Certificate</h2>
        <p className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Certificate download is available after your case reaches RELEASED status.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold">PDF Certificate</h2>

      <p className="text-sm text-muted-foreground">
        This entrypoint validates access for released cases and routes your request through
        the patient certificate download flow. Full PDF generation remains blocked until AHI
        finalizes certificate template and signature requirements.
      </p>

      <div className="rounded-lg border bg-background p-3 text-sm text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Case:</span> {caseNumber}
        </p>
        <p>
          <span className="font-medium text-foreground">Released:</span>{" "}
          {formatTimestamp(releasedAt)}
        </p>
      </div>

      {flashNotice ? (
        <p className="rounded-md border border-emerald-300/70 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {flashNotice}
        </p>
      ) : null}

      {flashError ? (
        <p className="rounded-md border border-rose-300/70 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {flashError}
        </p>
      ) : null}

      <form action={requestCertificateDownloadAction} className="flex flex-wrap gap-2">
        <input type="hidden" name="caseId" value={caseId} />
        <input type="hidden" name="returnPath" value={returnPath} />
        <Button type="submit" className="h-11 px-4">
          Download Certificate PDF
        </Button>
      </form>
    </section>
  );
}

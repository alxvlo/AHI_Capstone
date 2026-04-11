import { Button } from "@/components/ui/button";
import {
  formatTimestamp,
  isCaseReleased,
  type PatientResultFileRow,
} from "@/features/dashboard/patient/shared";

type ResultFilesProps = {
  statusCode: string | null;
  files: PatientResultFileRow[];
  filesError?: string | null;
};

export function ResultFiles({ statusCode, files, filesError = null }: ResultFilesProps) {
  if (!isCaseReleased(statusCode)) {
    return (
      <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Result Files</h2>
        <p className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          File downloads will become available after the case reaches RELEASED status.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Result Files</h2>

      <p className="rounded-md border border-sky-300/70 bg-sky-50 px-3 py-2 text-sm text-sky-900">
        File access UI is ready. Actual upload and signed-URL download wiring will be enabled in
        Phase 4 (Storage integration).
      </p>

      {filesError ? (
        <p className="rounded-md border border-rose-300/70 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          Unable to load result files: {filesError}
        </p>
      ) : null}

      {files.length === 0 ? (
        <p className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No uploaded result files are available for this case yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold">File Name</th>
                <th className="px-3 py-2 font-semibold">Department</th>
                <th className="px-3 py-2 font-semibold">Uploaded</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {files.map((fileRow) => (
                <tr key={fileRow.id} className="border-t">
                  <td className="px-3 py-2">{fileRow.fileName}</td>
                  <td className="px-3 py-2 text-muted-foreground">{fileRow.departmentName}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatTimestamp(fileRow.uploadedAt)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{fileRow.status}</td>
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-11 px-3 sm:h-9"
                      disabled
                    >
                      Download (Soon)
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

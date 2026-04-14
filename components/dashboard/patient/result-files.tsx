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

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeLabel(mime: string) {
  if (mime === "application/pdf") {
    return "PDF";
  }
  if (mime === "image/jpeg") {
    return "JPEG";
  }
  if (mime === "image/png") {
    return "PNG";
  }
  return mime;
}

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
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">Size</th>
                <th className="px-3 py-2 font-semibold">Uploaded</th>
                <th className="px-3 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {files.map((fileRow) => (
                <tr key={fileRow.fileid} className="border-t">
                  <td className="px-3 py-2">{fileRow.fileName}</td>
                  <td className="px-3 py-2 text-muted-foreground">{fileRow.departmentName}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {mimeLabel(fileRow.mimeType)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatBytes(fileRow.fileSize)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatTimestamp(fileRow.uploadedAt)}
                  </td>
                  <td className="px-3 py-2">
                    {fileRow.downloadUrl ? (
                      <a
                        href={fileRow.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={fileRow.fileName}
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-11 px-3 sm:h-9"
                        >
                          Download
                        </Button>
                      </a>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-11 px-3 sm:h-9"
                        disabled
                      >
                        Unavailable
                      </Button>
                    )}
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

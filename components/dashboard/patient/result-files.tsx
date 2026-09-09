import { DataTable, type DataTableColumn } from "@/components/dashboard/shared/data-table";
import { Button } from "@/components/ui/button";
import {
  formatTimestamp,
  isCaseReleased,
  type PatientResultFileRow,
} from "@/features/dashboard/patient/shared";
import { formatBytes } from "@/lib/format";

type ResultFilesProps = {
  statusCode: string | null;
  files: PatientResultFileRow[];
  filesError?: string | null;
};

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

const columns: DataTableColumn<PatientResultFileRow>[] = [
  {
    header: "File Name",
    cell: (fileRow) => fileRow.fileName,
  },
  {
    header: "Department",
    cell: (fileRow) => <span className="text-muted-foreground">{fileRow.departmentName}</span>,
  },
  {
    header: "Type",
    cell: (fileRow) => <span className="text-muted-foreground">{mimeLabel(fileRow.mimeType)}</span>,
  },
  {
    header: "Size",
    cell: (fileRow) => <span className="text-muted-foreground">{formatBytes(fileRow.fileSize)}</span>,
  },
  {
    header: "Uploaded",
    cell: (fileRow) => (
      <span className="text-muted-foreground">{formatTimestamp(fileRow.uploadedAt)}</span>
    ),
  },
  {
    header: "Action",
    cell: (fileRow) =>
      fileRow.downloadUrl ? (
        <a href={fileRow.downloadUrl} target="_blank" rel="noopener noreferrer" download={fileRow.fileName}>
          <Button type="button" variant="outline" size="sm" className="h-11 px-3 sm:h-9">
            Download
          </Button>
        </a>
      ) : (
        <Button type="button" variant="outline" size="sm" className="h-11 px-3 sm:h-9" disabled>
          Unavailable
        </Button>
      ),
  },
];

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
          <DataTable
            columns={columns}
            rows={files}
            rowKey={(fileRow) => fileRow.fileid}
            caption="Result files"
          />
        </div>
      )}
    </section>
  );
}

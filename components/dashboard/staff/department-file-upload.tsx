"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  uploadResultFileAction,
  deleteResultFileAction,
} from "@/features/dashboard/staff/actions";
import { formatBytes, formatTimestamp as formatTimestampBase } from "@/lib/format";

type UploadedFileRecord = {
  fileid: string;
  filename: string;
  mimetype: string;
  filesize: number;
  uploadedat: string | null;
  remarks: string | null;
};

type DepartmentFileUploadProps = {
  visitId: number;
  returnPath: string;
  existingFiles: UploadedFileRecord[];
  canUpload: boolean;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);

function formatTimestamp(value: string | null) {
  return formatTimestampBase(value, "Unknown");
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

export function DepartmentFileUpload({
  visitId,
  returnPath,
  existingFiles,
  canUpload,
}: DepartmentFileUploadProps) {
  const [clientError, setClientError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function validateFile(file: File) {
    if (!ALLOWED_TYPES.has(file.type)) {
      return `File type "${file.type}" is not allowed. Accepted: JPEG, PNG, PDF.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File exceeds the 10 MB size limit (${formatBytes(file.size)}).`;
    }
    return null;
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      const error = validateFile(file);
      setClientError(error);
    } else {
      setClientError(null);
    }
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file && fileInputRef.current) {
      const error = validateFile(file);
      setClientError(error);

      if (!error) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInputRef.current.files = dataTransfer.files;
      }
    }
  }

  return (
    <section className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <h3 className="text-sm font-semibold">Result Files</h3>

      {/* Upload form */}
      {canUpload ? (
        <form action={uploadResultFileAction} className="space-y-3">
          <input type="hidden" name="returnPath" value={returnPath} />
          <input type="hidden" name="visitId" value={visitId} />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/30 hover:border-muted-foreground/50"
            }`}
          >
            <p className="mb-2 text-sm text-muted-foreground">
              Drag and drop a file here, or click to select.
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Accepted: JPEG, PNG, PDF • Max 10 MB
            </p>
            <Input
              ref={fileInputRef}
              id={`file-upload-${visitId}`}
              type="file"
              name="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileChange}
              className="mx-auto max-w-xs"
              required
            />
          </div>

          {clientError ? (
            <p className="rounded-md border border-rose-300/70 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              {clientError}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor={`file-remarks-${visitId}`}>Remarks (Optional)</Label>
            <Textarea
              id={`file-remarks-${visitId}`}
              name="remarks"
              placeholder="Brief description of the uploaded file."
              rows={2}
            />
          </div>

          <Button type="submit" size="sm" disabled={clientError !== null}>
            Upload File
          </Button>
        </form>
      ) : (
        <p className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          File uploads are available only when visit status is IN_PROGRESS or COMPLETED.
        </p>
      )}

      {/* Existing files list */}
      {existingFiles.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No files uploaded for this visit yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold">File</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">Size</th>
                <th className="px-3 py-2 font-semibold">Uploaded</th>
                <th className="px-3 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {existingFiles.map((fileRecord) => (
                <tr key={fileRecord.fileid} className="border-t align-top">
                  <td className="px-3 py-2">
                    <p className="font-medium">{fileRecord.filename}</p>
                    {fileRecord.remarks ? (
                      <p className="text-xs text-muted-foreground">
                        {fileRecord.remarks}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {mimeLabel(fileRecord.mimetype)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatBytes(fileRecord.filesize)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatTimestamp(fileRecord.uploadedat)}
                  </td>
                  <td className="px-3 py-2">
                    <form action={deleteResultFileAction}>
                      <input type="hidden" name="returnPath" value={returnPath} />
                      <input type="hidden" name="fileId" value={fileRecord.fileid} />
                      <Button type="submit" variant="outline" size="sm">
                        Delete
                      </Button>
                    </form>
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

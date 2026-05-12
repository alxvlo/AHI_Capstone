import { StatusBadge } from "@/components/dashboard/shared/status-badge";

type RequiredTest = { testid: number; testname: string; category: string | null };

type Props = {
  required: RequiredTest[];
  encoded: number[];
};

export function RequiredTestsProgress({ required, encoded }: Props) {
  if (required.length === 0) return null;

  const done = required.filter((r) => encoded.includes(r.testid));
  const missing = required.filter((r) => !encoded.includes(r.testid));
  const allDone = missing.length === 0;

  return (
    <div className="rounded-md border bg-slate-50 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <strong>Required tests for this package</strong>
        <span className="flex items-center gap-2">
          {done.length}/{required.length} encoded
          {allDone && (
            <StatusBadge label="All required complete" tone="positive" />
          )}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-y-1" aria-label="Required tests checklist">
        {required.map((r) => (
          <li key={r.testid} className="flex items-center gap-2">
            <span aria-hidden="true">{encoded.includes(r.testid) ? "✅" : "☐"}</span>
            <span className={encoded.includes(r.testid) ? "text-slate-500 line-through" : ""}>
              {r.testname}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

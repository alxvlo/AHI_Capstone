"use client";

import { useState, useMemo, useTransition } from "react";
import { saveResultItemsAction } from "@/features/dashboard/staff/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CatalogEntry = {
  testid: number;
  testname: string;
  category: string | null;
  defaultunit: string | null;
  defaultref: string | null;
  valuetype: "numeric" | "categorical" | "text";
  validvalues: string[] | null;
};

type Props = {
  visitId: number;
  returnPath: string;
  catalog: CatalogEntry[];
};

export function TestResultForm({ visitId, returnPath, catalog }: Props) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const [value, setValue] = useState("");
  const [remarks, setRemarks] = useState("");
  const [pending, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const map = new Map<string, CatalogEntry[]>();
    for (const t of catalog) {
      const k = t.category ?? "Other";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [catalog]);

  const selected = useMemo(
    () => catalog.find((t) => t.testid === Number(selectedId)) ?? null,
    [selectedId, catalog]
  );

  return (
    <form
      action={(fd) =>
        startTransition(() => {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          saveResultItemsAction(fd);
        })
      }
      className="space-y-4"
    >
      <input type="hidden" name="visitId" value={visitId} />
      <input type="hidden" name="returnPath" value={returnPath} />

      {!customMode && (
        <div>
          <Label htmlFor="testId">Test</Label>
          <select
            id="testId"
            name="testId"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            required
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Select a test...</option>
            {grouped.map(([cat, items]) => (
              <optgroup key={cat} label={cat}>
                {items.map((t) => (
                  <option key={t.testid} value={t.testid}>
                    {t.testname}
                    {t.defaultunit ? ` (${t.defaultunit})` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setCustomMode(true)}
            className="mt-2 text-sm text-blue-600 underline"
          >
            + Custom test (free text)
          </button>
        </div>
      )}

      {customMode && (
        <div>
          <Label htmlFor="testName">Custom Test Name</Label>
          <Input
            id="testName"
            name="testName"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="e.g. Special Bloodwork"
            required
          />
          <button
            type="button"
            onClick={() => {
              setCustomMode(false);
              setCustomName("");
            }}
            className="mt-2 text-sm text-blue-600 underline"
          >
            ← Back to catalog
          </button>
        </div>
      )}

      <div>
        <Label htmlFor="value">
          Value
          {selected?.valuetype === "categorical" && selected.validvalues && (
            <span className="ml-2 text-xs text-gray-500">
              (choose: {selected.validvalues.join(" / ")})
            </span>
          )}
        </Label>
        {selected?.valuetype === "categorical" && selected.validvalues ? (
          <select
            id="value"
            name="value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Select...</option>
            {selected.validvalues.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        ) : (
          <Input
            id="value"
            name="value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={selected?.valuetype === "numeric" ? "e.g. 5.4" : "Enter result"}
            required
          />
        )}
      </div>

      {selected && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Label className="text-gray-500">Unit</Label>
            <div className="font-mono">{selected.defaultunit ?? "—"}</div>
            <input type="hidden" name="unit" value={selected.defaultunit ?? ""} />
          </div>
          <div>
            <Label className="text-gray-500">Reference Range</Label>
            <div className="font-mono">{selected.defaultref ?? "—"}</div>
            <input type="hidden" name="referenceRange" value={selected.defaultref ?? ""} />
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="remarks">Remarks (optional)</Label>
        <Textarea
          id="remarks"
          name="remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={2}
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save Result"}
      </Button>
    </form>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type RecentTriageItem = {
  caseNumber: string;
  completedAt: string;
};

type TriageRecentHistoryProps = {
  flashNotice?: string;
};

const STORAGE_KEY = "ahi_triage_recent_history";
const MAX_ITEMS = 10;
const RETENTION_MS = 30 * 60 * 1000;

function extractCaseNumberFromNotice(notice: string) {
  const match = notice.match(/Case\s+([A-Z0-9-]+)/i);
  return match?.[1] ?? null;
}

function parseStoredHistory(value: string | null): RecentTriageItem[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as RecentTriageItem[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item) =>
        item &&
        typeof item.caseNumber === "string" &&
        item.caseNumber.length > 0 &&
        typeof item.completedAt === "string"
    );
  } catch {
    return [];
  }
}

function pruneHistory(items: RecentTriageItem[]) {
  const now = Date.now();
  return items
    .filter((item) => {
      const parsed = Date.parse(item.completedAt);
      return !Number.isNaN(parsed) && now - parsed <= RETENTION_MS;
    })
    .slice(0, MAX_ITEMS);
}

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TriageRecentHistory({ flashNotice }: TriageRecentHistoryProps) {
  const [items, setItems] = useState<RecentTriageItem[]>([]);
  const newCaseNumber = useMemo(
    () => (flashNotice ? extractCaseNumberFromNotice(flashNotice) : null),
    [flashNotice]
  );

  useEffect(() => {
    const existing = pruneHistory(
      parseStoredHistory(localStorage.getItem(STORAGE_KEY))
    );
    setItems(existing);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  }, []);

  useEffect(() => {
    if (!newCaseNumber) {
      return;
    }

    const next = pruneHistory([
      {
        caseNumber: newCaseNumber,
        completedAt: new Date().toISOString(),
      },
      ...items.filter((item) => item.caseNumber !== newCaseNumber),
    ]);

    setItems(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newCaseNumber]);

  function handleClear() {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">Recently Triaged</CardTitle>
          <Button variant="outline" size="sm" onClick={handleClear}>
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={`${item.caseNumber}-${item.completedAt}`}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span className="font-medium">{item.caseNumber}</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                {formatTimestamp(item.completedAt)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

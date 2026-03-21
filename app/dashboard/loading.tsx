"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsSlow(true);
    }, 4000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-10 w-80 max-w-full animate-pulse rounded-md bg-muted" />
        <div className="h-6 w-[34rem] max-w-full animate-pulse rounded-md bg-muted/80" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="h-6 w-44 animate-pulse rounded-md bg-muted" />
            <div className="mt-4 h-5 w-full animate-pulse rounded-md bg-muted/80" />
            <div className="mt-2 h-5 w-5/6 animate-pulse rounded-md bg-muted/70" />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Verifying account role and loading your dashboard...
      </div>

      {isSlow ? (
        <p className="max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This is taking longer than usual. You can wait a moment or refresh
          the page while we finish checking your account access.
        </p>
      ) : null}
    </div>
  );
}

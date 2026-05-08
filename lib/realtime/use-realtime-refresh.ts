"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type RealtimeTable = "peme_case" | "department_visit";
type RealtimeEvent = "*" | "INSERT" | "UPDATE" | "DELETE";

type Options = {
  table: RealtimeTable;
  filter?: string;
  event?: RealtimeEvent;
  debounceMs?: number;
};

export function useRealtimeRefresh({
  table,
  filter,
  event = "*",
  debounceMs = 250,
}: Options) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channelName = `realtime:${table}:${filter ?? "all"}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event, schema: "public", table, filter },
        () => {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            router.refresh();
          }, debounceMs);
        }
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [table, filter, event, debounceMs, router]);
}

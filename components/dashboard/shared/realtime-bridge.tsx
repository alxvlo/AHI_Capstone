"use client";

import { useRealtimeRefresh } from "@/lib/realtime/use-realtime-refresh";

type RealtimeBridgeProps = {
  table: "peme_case" | "department_visit";
  filter?: string;
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  debounceMs?: number;
};

export function RealtimeBridge(props: RealtimeBridgeProps) {
  useRealtimeRefresh(props);
  return null;
}

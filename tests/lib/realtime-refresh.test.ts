import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockOn = vi.fn();
const mockSubscribe = vi.fn();
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  }),
}));

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

import { useRealtimeRefresh } from "@/lib/realtime/use-realtime-refresh";

describe("useRealtimeRefresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockChannel.mockReturnValue({ on: mockOn, subscribe: mockSubscribe });
    mockOn.mockReturnValue({ on: mockOn, subscribe: mockSubscribe });
  });

  it("opens a channel scoped to the table on mount", () => {
    renderHook(() =>
      useRealtimeRefresh({ table: "peme_case" })
    );
    expect(mockChannel).toHaveBeenCalledOnce();
    expect(mockSubscribe).toHaveBeenCalledOnce();
  });

  it("calls router.refresh after debounce when an event fires", () => {
    let handler: () => void = () => {};
    mockOn.mockImplementation((_event: unknown, _config: unknown, h: unknown) => {
      handler = h as () => void;
      return { on: mockOn, subscribe: mockSubscribe };
    });

    renderHook(() =>
      useRealtimeRefresh({ table: "peme_case", debounceMs: 100 })
    );
    handler();
    vi.advanceTimersByTime(150);

    expect(mockRefresh).toHaveBeenCalledOnce();
  });

  it("debounces multiple events into a single refresh", () => {
    let handler: () => void = () => {};
    mockOn.mockImplementation((_event: unknown, _config: unknown, h: unknown) => {
      handler = h as () => void;
      return { on: mockOn, subscribe: mockSubscribe };
    });

    renderHook(() =>
      useRealtimeRefresh({ table: "peme_case", debounceMs: 100 })
    );
    handler();
    handler();
    handler();
    vi.advanceTimersByTime(150);

    expect(mockRefresh).toHaveBeenCalledOnce();
  });

  it("removes the channel on unmount", () => {
    const { unmount } = renderHook(() =>
      useRealtimeRefresh({ table: "peme_case" })
    );
    unmount();
    expect(mockRemoveChannel).toHaveBeenCalledOnce();
  });

  it("forwards the filter to postgres_changes config", () => {
    renderHook(() =>
      useRealtimeRefresh({
        table: "department_visit",
        filter: "departmentid=eq.5",
      })
    );
    expect(mockOn).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        schema: "public",
        table: "department_visit",
        filter: "departmentid=eq.5",
      }),
      expect.any(Function)
    );
  });
});

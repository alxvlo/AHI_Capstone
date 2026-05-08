import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServerClient } from "@supabase/ssr";
import { updateSession } from "@/lib/supabase/middleware";

vi.mock("@supabase/ssr", async () => {
  const actual = await vi.importActual<typeof import("@supabase/ssr")>(
    "@supabase/ssr"
  );

  return {
    ...actual,
    createServerClient: vi.fn(),
  };
});

type MockUser = {
  id: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

function createServerSupabaseMock(options: {
  user: MockUser | null;
  role?: string | null;
}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: options.role ? { role: { rolename: options.role } } : null,
  });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: options.user } }),
    },
    from: vi.fn(() => ({ select })),
  };
}

function parseLocation(response: Response) {
  const location = response.headers.get("location");

  expect(location).toBeTruthy();

  return new URL(location ?? "", "http://localhost");
}

const createServerClientMock = vi.mocked(createServerClient);

describe("updateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it.each([
    { path: "/dashboard/staff", expected: "/auth/staff/sign-in" },
    { path: "/dashboard/staff/queue", expected: "/auth/staff/sign-in" },
    { path: "/dashboard/admin", expected: "/auth/staff/sign-in" },
    { path: "/dashboard/client", expected: "/auth/agency/sign-in" },
    { path: "/dashboard/patient", expected: "/auth/patient/sign-in" },
  ])(
    "redirects unauthenticated $path to $expected",
    async ({ path, expected }) => {
      createServerClientMock.mockReturnValue(
        createServerSupabaseMock({ user: null }) as never
      );

      const response = await updateSession(
        new NextRequest(`http://localhost${path}`)
      );
      const location = parseLocation(response);

      expect(response.status).toBe(307);
      expect(location.pathname).toBe(expected);
      expect(location.searchParams.get("next")).toBe(path);
    }
  );

  it("redirects authenticated users away from auth entry pages", async () => {
    createServerClientMock.mockReturnValue(
      createServerSupabaseMock({
        user: { id: "user-auth" },
        role: "Patient",
      }) as never
    );

    const response = await updateSession(
      new NextRequest("http://localhost/auth/patient/sign-in")
    );
    const location = parseLocation(response);

    expect(response.status).toBe(307);
    expect(location.pathname).toBe("/dashboard");
  });

  it("redirects /dashboard to the authenticated role home", async () => {
    createServerClientMock.mockReturnValue(
      createServerSupabaseMock({
        user: { id: "user-1" },
        role: "Patient",
      }) as never
    );

    const response = await updateSession(new NextRequest("http://localhost/dashboard"));
    const location = parseLocation(response);

    expect(response.status).toBe(307);
    expect(location.pathname).toBe("/dashboard/patient");
  });

  it("blocks dashboard access when no role is resolved", async () => {
    createServerClientMock.mockReturnValue(
      createServerSupabaseMock({
        user: { id: "user-missing-role" },
        role: null,
      }) as never
    );

    const response = await updateSession(new NextRequest("http://localhost/dashboard"));
    const location = parseLocation(response);

    expect(response.status).toBe(307);
    expect(location.pathname).toBe("/unauthorized");
    expect(location.searchParams.get("reason")).toBe("missing_role");
  });

  it("blocks role mismatches on protected dashboards", async () => {
    createServerClientMock.mockReturnValue(
      createServerSupabaseMock({
        user: { id: "user-2" },
        role: "Patient",
      }) as never
    );

    const response = await updateSession(
      new NextRequest("http://localhost/dashboard/admin")
    );
    const location = parseLocation(response);

    expect(response.status).toBe(307);
    expect(location.pathname).toBe("/unauthorized");
    expect(location.searchParams.get("reason")).toBe("role_mismatch");
  });

  it("blocks department staff users without a department claim", async () => {
    createServerClientMock.mockReturnValue(
      createServerSupabaseMock({
        user: {
          id: "user-3",
          app_metadata: {},
          user_metadata: {},
        },
        role: "Department Staff",
      }) as never
    );

    const response = await updateSession(
      new NextRequest("http://localhost/dashboard/staff")
    );
    const location = parseLocation(response);

    expect(response.status).toBe(307);
    expect(location.pathname).toBe("/unauthorized");
    expect(location.searchParams.get("reason")).toBe("missing_department_claim");
  });

  it("treats zero-value department claims as invalid", async () => {
    createServerClientMock.mockReturnValue(
      createServerSupabaseMock({
        user: {
          id: "user-4",
          app_metadata: { department_id: "0" },
          user_metadata: {},
        },
        role: "Department Staff",
      }) as never
    );

    const response = await updateSession(
      new NextRequest("http://localhost/dashboard/staff")
    );
    const location = parseLocation(response);

    expect(response.status).toBe(307);
    expect(location.pathname).toBe("/unauthorized");
    expect(location.searchParams.get("reason")).toBe("missing_department_claim");
  });
});

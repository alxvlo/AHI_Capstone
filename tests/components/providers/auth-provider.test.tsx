import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/components/providers/auth-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

type MockUser = {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
  };
  app_metadata?: Record<string, unknown>;
};

type MockRpcResult = {
  data: unknown;
  error: {
    message: string;
    code?: string;
  } | null;
};

function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: "user-1",
    email: "patient@example.com",
    user_metadata: {
      full_name: "Patient Example",
    },
    app_metadata: {},
    ...overrides,
  };
}

function createBrowserSupabaseMock(options: {
  currentUser?: MockUser | null;
  signInResult?: { data: { user: MockUser | null }; error: MockRpcResult["error"] };
  signUpResult?: {
    data: { user: MockUser | null; session: { user: MockUser } | null };
    error: MockRpcResult["error"];
  };
  userAccountResult?: MockRpcResult;
  rpcResults?: Record<string, MockRpcResult>;
} = {}) {
  const userAccountResult =
    options.userAccountResult ??
    ({
      data: { userid: "user-1" },
      error: null,
    } satisfies MockRpcResult);

  const rpcResults = new Map(Object.entries(options.rpcResults ?? {}));
  const maybeSingle = vi.fn().mockResolvedValue(userAccountResult);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  const mock = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: options.currentUser ?? null } }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword:
        vi.fn().mockResolvedValue(
          options.signInResult ?? {
            data: { user: createMockUser() },
            error: null,
          }
        ),
      signUp:
        vi.fn().mockResolvedValue(
          options.signUpResult ?? {
            data: {
              user: createMockUser({ email: "signup@example.com" }),
              session: null,
            },
            error: null,
          }
        ),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resend: vi.fn().mockResolvedValue({ error: null }),
    },
    from,
    rpc: vi.fn((name: string) =>
      Promise.resolve(rpcResults.get(name) ?? { data: null, error: null })
    ),
  };

  return { mock, maybeSingle };
}

function Wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider initialUser={null}>{children}</AuthProvider>;
}

const createSupabaseBrowserClientMock = vi.mocked(createSupabaseBrowserClient);

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("formats unconfirmed-email login failures", async () => {
    const { mock } = createBrowserSupabaseMock({
      signInResult: {
        data: { user: null },
        error: { message: "Email not confirmed" },
      },
    });
    createSupabaseBrowserClientMock.mockReturnValue(mock as never);

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let loginResult: Awaited<ReturnType<typeof result.current.login>> | undefined;
    await act(async () => {
      loginResult = await result.current.login("User@Example.com", "Secret123!");
    });

    expect(loginResult).toEqual({
      success: false,
      error: "Please confirm your email before signing in.",
    });
    expect(mock.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "Secret123!",
    });
    expect(mock.rpc).toHaveBeenCalledWith(
      "log_auth_audit_event",
      expect.objectContaining({
        p_actiontype: "SIGNIN_FAILURE",
        p_username: "user@example.com",
      })
    );
  });

  it("stages signup details when email confirmation is required", async () => {
    const { mock } = createBrowserSupabaseMock({
      signUpResult: {
        data: {
          user: createMockUser({ email: "signup@example.com" }),
          session: null,
        },
        error: null,
      },
      rpcResults: {
        stage_patient_signup: { data: null, error: null },
      },
    });
    createSupabaseBrowserClientMock.mockReturnValue(mock as never);

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let signupResult: Awaited<ReturnType<typeof result.current.signup>> | undefined;
    await act(async () => {
      signupResult = await result.current.signup({
        fullName: "Signup Patient",
        dateOfBirth: "1999-05-14",
        sex: "Female",
        email: "Signup@Example.com",
        password: "Secret123!",
        contactNumber: "+63 912 345 6789",
        nationality: "Filipino",
        governmentIdType: "Passport",
        governmentId: " ab 123 456 ",
      });
    });

    expect(signupResult).toEqual({
      success: true,
      requiresEmailConfirmation: true,
    });
    expect(mock.rpc).toHaveBeenCalledWith("stage_patient_signup", {
      p_email: "signup@example.com",
      p_fullname: "Signup Patient",
      p_dateofbirth: "1999-05-14",
      p_sex: "Female",
      p_nationality: "Filipino",
      p_contactnumber: "+639123456789",
      p_governmentid: "Passport::AB123456",
    });
    expect(mock.auth.signOut).not.toHaveBeenCalled();
  });

  it("completes a pending patient profile on first successful login", async () => {
    const loggedInUser = createMockUser({
      id: "user-42",
      email: "patient.zero@example.com",
      user_metadata: { full_name: "Patient Zero" },
    });
    const { mock } = createBrowserSupabaseMock({
      signInResult: {
        data: { user: loggedInUser },
        error: null,
      },
      userAccountResult: {
        data: null,
        error: null,
      },
      rpcResults: {
        complete_patient_profile_from_pending: { data: null, error: null },
      },
    });
    createSupabaseBrowserClientMock.mockReturnValue(mock as never);

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let loginResult: Awaited<ReturnType<typeof result.current.login>> | undefined;
    await act(async () => {
      loginResult = await result.current.login(
        "patient.zero@example.com",
        "Secret123!"
      );
    });

    expect(loginResult).toEqual({ success: true });
    expect(mock.rpc).toHaveBeenCalledWith(
      "complete_patient_profile_from_pending"
    );
    await waitFor(() => {
      expect(result.current.user).toEqual({
        id: "user-42",
        email: "patient.zero@example.com",
        name: "Patient Zero",
      });
    });
  });
});

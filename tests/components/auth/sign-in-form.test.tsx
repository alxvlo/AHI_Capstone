import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";

const { login, push, replace, toastError, toastSuccess, toastInfo, authState } = vi.hoisted(() => ({
  login: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  toastInfo: vi.fn(),
  authState: { user: null as object | null, isLoading: false },
}));

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ login, user: authState.user, isLoading: authState.isLoading }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));
vi.mock("sonner", () => ({
  toast: { error: (m: string) => toastError(m), success: (m: string) => toastSuccess(m), info: (m: string) => toastInfo(m) },
}));

import { SignInForm } from "@/components/auth/sign-in-form";

function renderForm(overrides: Partial<ComponentProps<typeof SignInForm>> = {}) {
  return render(
    <SignInForm
      accent="primary"
      redirectTo="/dashboard/patient"
      emailLabel="Email"
      emailPlaceholder="you@example.com"
      passwordPlaceholder="Enter your password"
      pendingLabel="Signing In..."
      successMessage="Welcome back!"
      fallbackError="Invalid credentials"
      footer={<a href="/x">Footer</a>}
      {...overrides}
    />
  );
}

describe("SignInForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = null;
    authState.isLoading = false;
  });

  it("refuses to submit empty fields without calling login", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(login).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("Please fill in all fields");
  });

  it("calls login with the typed credentials and redirects on success", async () => {
    login.mockResolvedValue({ success: true });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), "ana@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "secret");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(login).toHaveBeenCalledWith("ana@example.com", "secret"));
    expect(toastSuccess).toHaveBeenCalledWith("Welcome back!");
    expect(replace).toHaveBeenCalledWith("/dashboard/patient");
  });

  it("shows the server error by default and the fallback when there is none", async () => {
    login.mockResolvedValueOnce({ success: false, error: "Account locked" });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), "a@b.c");
    await userEvent.type(screen.getByLabelText(/password/i), "x");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Account locked"));
  });

  it("shows the fallbackError when login fails with no server error message", async () => {
    login.mockResolvedValueOnce({ success: false });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), "a@b.c");
    await userEvent.type(screen.getByLabelText(/password/i), "x");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Invalid credentials"));
  });

  it("never shows the server error when hideServerError is set (agency anti-enumeration)", async () => {
    login.mockResolvedValueOnce({ success: false, error: "No such user" });
    renderForm({ hideServerError: true, fallbackError: "Invalid credentials or unauthorized access" });
    await userEvent.type(screen.getByLabelText(/email/i), "a@b.c");
    await userEvent.type(screen.getByLabelText(/password/i), "x");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Invalid credentials or unauthorized access")
    );
    expect(toastError).not.toHaveBeenCalledWith("No such user");
  });

  it("routes an unconfirmed-email error to checkEmailPath with the lowercased email", async () => {
    login.mockResolvedValueOnce({ success: false, error: "Please confirm your email first" });
    renderForm({ checkEmailPath: "/auth/patient/check-email" });
    await userEvent.type(screen.getByLabelText(/email/i), "Ana@Example.com ");
    await userEvent.type(screen.getByLabelText(/password/i), "x");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/auth/patient/check-email?email=ana%40example.com")
    );
  });

  it("does not route to checkEmailPath when the prop is absent", async () => {
    login.mockResolvedValueOnce({ success: false, error: "Please confirm your email first" });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), "a@b.c");
    await userEvent.type(screen.getByLabelText(/password/i), "x");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Please confirm your email first"));
    expect(push).not.toHaveBeenCalled();
  });

  it("redirects an already-signed-in user to redirectTo without calling login", async () => {
    authState.user = { id: "u1" };
    authState.isLoading = false;
    renderForm();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard/patient"));
    expect(login).not.toHaveBeenCalled();
  });

  it("does not redirect an already-signed-in user while auth is still loading", async () => {
    authState.user = { id: "u1" };
    authState.isLoading = true;
    renderForm();
    expect(replace).not.toHaveBeenCalled();
  });

  it("never surfaces a server note on success when hideServerError is set", async () => {
    login.mockResolvedValueOnce({ success: true, error: "boom" });
    renderForm({
      hideServerError: true,
      fallbackError: "Invalid credentials or unauthorized access",
      redirectTo: "/dashboard/client",
    });
    await userEvent.type(screen.getByLabelText(/email/i), "a@b.c");
    await userEvent.type(screen.getByLabelText(/password/i), "x");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Welcome back!"));
    expect(toastInfo).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/dashboard/client");
  });

  it("surfaces a server note on success when hideServerError is not set", async () => {
    login.mockResolvedValueOnce({ success: true, error: "note" });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), "a@b.c");
    await userEvent.type(screen.getByLabelText(/password/i), "x");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Welcome back!"));
    expect(toastInfo).toHaveBeenCalledWith("note");
  });
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";

const { login, push, replace, toastError, toastSuccess } = vi.hoisted(() => ({
  login: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ login, user: null, isLoading: false }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));
vi.mock("sonner", () => ({
  toast: { error: (m: string) => toastError(m), success: (m: string) => toastSuccess(m), info: vi.fn() },
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
});

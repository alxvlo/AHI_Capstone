"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { AuthFrame } from "@/components/auth/auth-frame";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function PatientSignInPage() {
  const searchParams = useSearchParams();
  const emailConfirmed = searchParams.get("confirmed") === "1";

  return (
    <AuthFrame
      accent="primary"
      icon={Plus}
      homeHref="/"
      title="Welcome Back"
      description="Sign in to your American Hospital account"
      banner={
        emailConfirmed ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Your email has been confirmed. Sign in to continue.
          </p>
        ) : null
      }
    >
      <SignInForm
        accent="primary"
        redirectTo="/dashboard/patient"
        emailLabel="Email"
        emailPlaceholder="you@example.com"
        passwordPlaceholder="Enter your password"
        pendingLabel="Signing In..."
        successMessage="Welcome back!"
        fallbackError="Invalid credentials"
        checkEmailPath="/auth/patient/check-email"
        footer={
          <>
            <Link href="/auth/patient/forgot-password" className="text-sm font-medium text-primary hover:underline">
              Forgot Password?
            </Link>
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/auth/patient/sign-up" className="font-semibold text-primary hover:underline">
                Sign Up
              </Link>
            </p>
          </>
        }
      />
    </AuthFrame>
  );
}

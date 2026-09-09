"use client";

import Link from "next/link";
import { Activity } from "lucide-react";
import { AuthFrame } from "@/components/auth/auth-frame";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function StaffSignInPage() {
  return (
    <AuthFrame
      accent="emerald"
      icon={Activity}
      homeHref="/auth"
      title="Staff Portal"
      description="Hospital internal network access"
    >
      <SignInForm
        accent="emerald"
        redirectTo="/dashboard"
        emailLabel="Staff Email"
        emailPlaceholder="name@ahi.local"
        passwordPlaceholder="••••••••"
        pendingLabel="Authenticating..."
        successMessage="Authentication successful"
        fallbackError="Invalid staff credentials"
        footer={
          <p className="text-sm text-muted-foreground">
            Return to <Link href="/auth" className="text-emerald-600 hover:underline">Selection</Link>
          </p>
        }
      />
    </AuthFrame>
  );
}

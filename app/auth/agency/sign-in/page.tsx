"use client";

import Link from "next/link";
import { Building } from "lucide-react";
import { AuthFrame } from "@/components/auth/auth-frame";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function AgencySignInPage() {
  return (
    <AuthFrame
      accent="indigo"
      icon={Building}
      iconStrokeWidth={2.5}
      homeHref="/auth"
      title="Agency / Client Portal"
      description="Corporate representative access"
    >
      <SignInForm
        accent="indigo"
        redirectTo="/dashboard/client"
        emailLabel="Company Email / Username"
        emailPlaceholder="rep@company.com"
        passwordPlaceholder="••••••••"
        pendingLabel="Authenticating..."
        successMessage="Authentication successful"
        fallbackError="Invalid credentials or unauthorized access"
        hideServerError
        footer={
          <p className="text-sm text-muted-foreground">
            Return to <Link href="/auth" className="text-indigo-600 hover:underline">Selection</Link>
          </p>
        }
      />
    </AuthFrame>
  );
}

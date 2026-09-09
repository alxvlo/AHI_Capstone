"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import type { AuthAccent } from "@/components/auth/auth-frame";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const BUTTON_ACCENT: Record<AuthAccent, string> = {
  primary: "shadow-primary/20",
  emerald: "bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700",
  indigo: "bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700",
};
const RING_ACCENT: Record<AuthAccent, string> = {
  primary: "",
  emerald: "focus-visible:ring-emerald-500",
  indigo: "focus-visible:ring-indigo-500",
};

type SignInFormProps = {
  accent: AuthAccent;
  redirectTo: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  submitLabel?: string;
  pendingLabel: string;
  successMessage: string;
  fallbackError: string;
  hideServerError?: boolean;
  checkEmailPath?: string;
  footer: ReactNode;
};

export function SignInForm({
  accent,
  redirectTo,
  emailLabel,
  emailPlaceholder,
  passwordPlaceholder,
  submitLabel = "Sign In",
  pendingLabel,
  successMessage,
  fallbackError,
  hideServerError = false,
  checkEmailPath,
  footer,
}: SignInFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(redirectTo);
    }
  }, [isLoading, redirectTo, router, user]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.success) {
      toast.success(successMessage);
      if (result.error && !hideServerError) {
        toast.info(result.error);
      }
      router.replace(redirectTo);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (
      checkEmailPath &&
      !hideServerError &&
      normalizedEmail &&
      result.error?.toLowerCase().includes("confirm your email")
    ) {
      toast.error(result.error);
      router.push(`${checkEmailPath}?email=${encodeURIComponent(normalizedEmail)}`);
      return;
    }

    toast.error(hideServerError ? fallbackError : result.error ?? fallbackError);
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{emailLabel}</Label>
          <Input
            id="email"
            type="email"
            placeholder={emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cn("rounded-xl", RING_ACCENT[accent])}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder={passwordPlaceholder}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn("rounded-xl", RING_ACCENT[accent])}
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className={cn("w-full rounded-xl shadow-md", BUTTON_ACCENT[accent])}
        >
          {isSubmitting ? pendingLabel : submitLabel}
        </Button>
        {footer}
      </CardFooter>
    </form>
  );
}

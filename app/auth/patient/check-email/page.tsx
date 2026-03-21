"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MailCheck, Plus, RotateCw } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PatientCheckEmailPage() {
  const searchParams = useSearchParams();
  const { resendSignupConfirmation } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const email = useMemo(
    () => searchParams.get("email")?.trim().toLowerCase() ?? "",
    [searchParams]
  );

  async function handleResend() {
    if (!email) {
      toast.error("Missing email address for confirmation resend.");
      return;
    }

    setIsResending(true);

    const result = await resendSignupConfirmation(email);

    setIsResending(false);

    if (!result.success) {
      toast.error(result.error ?? "Unable to resend the confirmation email.");
      return;
    }

    toast.success("Confirmation email sent. Check your inbox again.");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/[0.04] via-background to-secondary/40" />
      <div className="absolute right-0 top-0 -z-10 h-[420px] w-[420px] rounded-full bg-primary/[0.06] blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg"
      >
        <Card className="border-2 shadow-xl shadow-primary/[0.04]">
          <CardHeader className="text-center">
            <Link
              href="/"
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25"
            >
              <Plus
                className="h-6 w-6 text-primary-foreground"
                strokeWidth={3}
              />
            </Link>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MailCheck className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription>
              Confirm your email address before accessing the patient portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm leading-relaxed text-muted-foreground">
              We sent a verification link to:
            </p>
            <p className="rounded-xl border bg-secondary/40 px-4 py-3 text-sm font-semibold text-foreground">
              {email || "No email address was provided in the link."}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              After confirming your email, return here and sign in to continue.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={!email || isResending}
              onClick={handleResend}
              className="w-full rounded-xl"
            >
              <RotateCw className="mr-2 h-4 w-4" />
              {isResending ? "Resending..." : "Resend Confirmation Email"}
            </Button>
            <Button asChild className="w-full rounded-xl shadow-md shadow-primary/20">
              <Link href="/auth/patient/sign-in">Go To Sign In</Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Need a different email?{" "}
              <Link
                href="/auth/patient/sign-up"
                className="font-semibold text-primary hover:underline"
              >
                Create another account
              </Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}

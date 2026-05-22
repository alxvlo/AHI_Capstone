"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { resetPassword } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }

    setIsSubmitting(true);

    const result = await resetPassword(email);

    setIsSubmitting(false);

    if (result.success) {
      setEmailSent(true);
      toast.success("Password reset email sent. Please check your inbox.");
      return;
    }

    toast.error(result.error ?? "Unable to send reset email. Please try again.");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/[0.04] via-background to-secondary/40" />
      <div className="absolute right-0 top-0 -z-10 h-[400px] w-[400px] rounded-full bg-primary/[0.06] blur-3xl" />

      <div className="w-full max-w-md animate-fade-in-up">
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
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>
              Enter your email address and we&apos;ll send you a link to reset
              your password.
            </CardDescription>
          </CardHeader>
          {emailSent ? (
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-800">
                A password reset link has been sent to{" "}
                <span className="font-semibold">{email}</span>. Please check
                your inbox and follow the instructions.
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl shadow-md shadow-primary/20"
                >
                  {isSubmitting ? "Sending..." : "Send Reset Link"}
                </Button>
              </CardFooter>
            </form>
          )}
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              Remember your password?{" "}
              <Link
                href="/auth/patient/sign-in"
                className="font-semibold text-primary hover:underline"
              >
                Sign In
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AuthFrame } from "@/components/auth/auth-frame";

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
    <AuthFrame
      accent="primary"
      icon={Plus}
      homeHref="/"
      title="Reset Password"
      description="Enter your email address and we'll send you a link to reset your password."
    >
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
    </AuthFrame>
  );
}

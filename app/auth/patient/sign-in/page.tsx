"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { motion } from "framer-motion";

const PATIENT_DASHBOARD_PATH = "/dashboard/patient";

export default function PatientSignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailConfirmed = searchParams.get("confirmed") === "1";

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(PATIENT_DASHBOARD_PATH);
    }
  }, [isLoading, router, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    const result = await login(email, password);

    setIsSubmitting(false);

    if (result.success) {
      toast.success("Welcome back!");
      if (result.error) {
        toast.info(result.error);
      }
      router.replace(PATIENT_DASHBOARD_PATH);
      router.refresh();
      return;
    }

    if (
      result.error?.toLowerCase().includes("confirm your email") &&
      email.trim()
    ) {
      toast.error(result.error);
      router.push(
        `/auth/patient/check-email?email=${encodeURIComponent(
          email.trim().toLowerCase()
        )}`
      );
      return;
    }

    toast.error(result.error ?? "Invalid credentials");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/[0.04] via-background to-secondary/40" />
      <div className="absolute right-0 top-0 -z-10 h-[400px] w-[400px] rounded-full bg-primary/[0.06] blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
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
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your American Hospital account
            </CardDescription>
            {emailConfirmed ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Your email has been confirmed. Sign in to continue.
              </p>
            ) : null}
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="text-right">
                <Link
                  href="/auth/patient/forgot-password"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl shadow-md shadow-primary/20"
              >
                {isSubmitting ? "Signing In..." : "Sign In"}
              </Button>
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  href="/auth/patient/sign-up"
                  className="font-semibold text-primary hover:underline"
                >
                  Sign Up
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

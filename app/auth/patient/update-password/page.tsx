"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
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

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const [supabase] = useState(() => createSupabaseBrowserClient());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error("Please fill in both password fields.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password });

    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Your password has been updated. Redirecting to sign in...");
    await supabase.auth.signOut();
    router.push("/auth/patient/sign-in");
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
            <CardTitle className="text-2xl">Update Password</CardTitle>
            <CardDescription>
              Enter your new password below to complete the reset.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                {isSubmitting ? "Updating..." : "Update Password"}
              </Button>
              <p className="text-sm text-muted-foreground">
                <Link
                  href="/auth/patient/sign-in"
                  className="font-semibold text-primary hover:underline"
                >
                  Back to Sign In
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Activity } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function StaffSignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard/staff");
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
      toast.success("Authentication successful");
      router.push("/dashboard/staff");
      router.refresh();
      return;
    }

    toast.error(result.error ?? "Invalid staff credentials");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-500/[0.04] via-background to-secondary/40" />
      <div className="absolute right-0 top-0 -z-10 h-[400px] w-[400px] rounded-full bg-emerald-500/[0.06] blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <Card className="border-2 border-emerald-500/10 shadow-xl shadow-emerald-500/[0.04]">
          <CardHeader className="text-center">
            <Link
              href="/auth"
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-600/25"
            >
              <Activity
                className="h-6 w-6 text-primary-foreground"
                strokeWidth={3}
              />
            </Link>
            <CardTitle className="text-2xl">Staff Portal</CardTitle>
            <CardDescription>
              Hospital internal network access
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Staff Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@ahi.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl focus-visible:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl focus-visible:ring-emerald-500"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700"
              >
                {isSubmitting ? "Authenticating..." : "Sign In"}
              </Button>
              <p className="text-sm text-muted-foreground">
                Return to <Link href="/auth" className="text-emerald-600 hover:underline">Selection</Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

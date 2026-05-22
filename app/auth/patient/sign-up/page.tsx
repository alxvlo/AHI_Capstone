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
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  formatPhilippineMobileInput,
  isValidPhilippineMobile,
} from "@/lib/phone";
import { GOVERNMENT_ID_TYPES } from "@/lib/government-id";

export default function PatientSignUpPage() {
  const [form, setForm] = useState({
    fullName: "",
    dateOfBirth: "",
    sex: "",
    email: "",
    password: "",
    confirmPassword: "",
    contactNumber: "",
    nationality: "",
    governmentIdType: "",
    governmentId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signup, user, isLoading } = useAuth();
  const router = useRouter();

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  useEffect(() => {
    if (!isLoading && user && !isSubmitting) {
      router.replace("/dashboard");
    }
  }, [isLoading, isSubmitting, router, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (
      !form.fullName ||
      !form.dateOfBirth ||
      !form.sex ||
      !form.email ||
      !form.password ||
      !form.confirmPassword ||
      !form.contactNumber ||
      !form.governmentIdType ||
      !form.governmentId
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (form.contactNumber && !isValidPhilippineMobile(form.contactNumber)) {
      toast.error(
        "Please enter a valid Philippine mobile number (e.g., +63 912 345 6789)"
      );
      return;
    }

    setIsSubmitting(true);

    const result = await signup({
      fullName: form.fullName,
      dateOfBirth: form.dateOfBirth,
      sex: form.sex,
      email: form.email,
      password: form.password,
      contactNumber: form.contactNumber,
      nationality: form.nationality,
      governmentIdType: form.governmentIdType,
      governmentId: form.governmentId,
    });

    setIsSubmitting(false);

    if (result.success && result.requiresEmailConfirmation) {
      toast.success("Account created. Confirm your email before signing in.");
      router.push(
        `/auth/patient/check-email?email=${encodeURIComponent(
          form.email.trim().toLowerCase()
        )}`
      );
      return;
    }

    if (result.success) {
      toast.success("Account and patient profile created successfully!");
      router.push("/dashboard");
      return;
    }

    toast.error(result.error ?? "Unable to create your account");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/[0.04] via-background to-secondary/40" />
      <div className="absolute -left-20 bottom-0 -z-10 h-[400px] w-[400px] rounded-full bg-accent/[0.08] blur-3xl" />

      <div className="w-full max-w-lg animate-fade-in-up">
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
            <CardTitle className="text-2xl">Create Patient Account</CardTitle>
            <CardDescription>
              Register for your American Hospital PEME portal access
            </CardDescription>
            <p className="text-sm text-muted-foreground">
              If email verification is enabled, you will confirm your email
              before continuing to the portal.
            </p>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fullName"
                  placeholder="Juan Dela Cruz"
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">
                    Date of Birth <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => update("dateOfBirth", e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sex">
                    Sex <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="sex"
                    value={form.sex}
                    onChange={(e) => update("sex", e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    Confirm Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repeat your password"
                    value={form.confirmPassword}
                    onChange={(e) => update("confirmPassword", e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNumber">
                  Contact Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contactNumber"
                  type="tel"
                  placeholder="+63 912 345 6789"
                  value={form.contactNumber}
                  onChange={(e) =>
                    update(
                      "contactNumber",
                      formatPhilippineMobileInput(e.target.value)
                    )
                  }
                  inputMode="numeric"
                  autoComplete="tel-national"
                  className="rounded-xl"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input
                    id="nationality"
                    placeholder="Filipino"
                    value={form.nationality}
                    onChange={(e) => update("nationality", e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="governmentIdType">
                    ID Type <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="governmentIdType"
                    value={form.governmentIdType}
                    onChange={(e) => update("governmentIdType", e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select ID type</option>
                    {GOVERNMENT_ID_TYPES.map((idType) => (
                      <option key={idType} value={idType}>
                        {idType}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="governmentId">
                  ID Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="governmentId"
                  placeholder="Enter ID number"
                  value={form.governmentId}
                  onChange={(e) => update("governmentId", e.target.value)}
                  className="rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  Use the same ID type and number recorded during Reception registration.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl shadow-md shadow-primary/20"
              >
                {isSubmitting ? "Creating Account..." : "Create Account"}
              </Button>
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/auth/patient/sign-in"
                  className="font-semibold text-primary hover:underline"
                >
                  Sign In
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

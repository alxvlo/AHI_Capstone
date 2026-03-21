"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if applicable
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-destructive/10 text-destructive">
        <AlertCircle className="h-10 w-10 shrink-0" strokeWidth={2.5} />
      </div>
      <h1 className="mb-4 text-4xl font-extrabold tracking-tight lg:text-5xl">
        System Error
      </h1>
      <p className="mb-8 max-w-md text-lg text-muted-foreground">
        An unexpected error occurred while processing your request. Please try
        again or return to safety.
      </p>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button onClick={() => reset()} size="lg" className="rounded-full shadow-lg">
          Try Again
        </Button>
        <Button asChild size="lg" variant="outline" className="rounded-full">
          <Link href="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

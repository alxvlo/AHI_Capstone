"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary">
        <Plus className="h-10 w-10 shrink-0" strokeWidth={3} />
      </div>
      <h1 className="mb-4 text-4xl font-extrabold tracking-tight lg:text-5xl">
        Page Not Found
      </h1>
      <p className="mb-8 max-w-md text-lg text-muted-foreground">
        The clinic page or resource you are looking for does not exist or has
        been moved.
      </p>
      <div className="flex gap-4">
        <Button asChild size="lg" className="rounded-full shadow-lg">
          <Link href="/">Return to Public Home</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="rounded-full">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

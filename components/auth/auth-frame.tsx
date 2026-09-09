import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type AuthAccent = "primary" | "emerald" | "indigo";

// Full class strings, not template literals: Tailwind only emits classes it can see.
const ACCENT = {
  primary: {
    wash: "from-primary/[0.04]",
    glow: "bg-primary/[0.06]",
    card: "shadow-primary/[0.04]",
    tile: "bg-primary shadow-primary/25",
  },
  emerald: {
    wash: "from-emerald-500/[0.04]",
    glow: "bg-emerald-500/[0.06]",
    card: "border-emerald-500/10 shadow-emerald-500/[0.04]",
    tile: "bg-emerald-600 shadow-emerald-600/25",
  },
  indigo: {
    wash: "from-indigo-500/[0.04]",
    glow: "bg-indigo-500/[0.06]",
    card: "border-indigo-500/10 shadow-indigo-500/[0.04]",
    tile: "bg-indigo-600 shadow-indigo-600/25",
  },
} satisfies Record<AuthAccent, Record<string, string>>;

type AuthFrameProps = {
  accent: AuthAccent;
  icon: LucideIcon;
  iconStrokeWidth?: number;
  homeHref: string;
  title: string;
  description: string;
  banner?: ReactNode;
  children: ReactNode;
};

export function AuthFrame({
  accent,
  icon: Icon,
  iconStrokeWidth = 3,
  homeHref,
  title,
  description,
  banner,
  children,
}: AuthFrameProps) {
  const a = ACCENT[accent];
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className={cn("absolute inset-0 -z-10 bg-gradient-to-br via-background to-secondary/40", a.wash)} />
      <div className={cn("absolute right-0 top-0 -z-10 h-[400px] w-[400px] rounded-full blur-3xl", a.glow)} />
      <div className="w-full max-w-md animate-fade-in-up">
        <Card className={cn("border-2 shadow-xl", a.card)}>
          <CardHeader className="text-center">
            <Link
              href={homeHref}
              className={cn("mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg", a.tile)}
            >
              <Icon className="h-6 w-6 text-primary-foreground" strokeWidth={iconStrokeWidth} />
            </Link>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
            {banner}
          </CardHeader>
          {children}
        </Card>
      </div>
    </div>
  );
}

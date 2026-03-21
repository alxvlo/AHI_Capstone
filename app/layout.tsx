import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "American Hospital Inc. - PEME Portal",
  description:
    "Real-Time Pre-Employment Medical Examination monitoring and result access system for American Hospital Inc.",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function RootLayout({ children }: RootLayoutProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider initialUser={user}>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight, BriefcaseMedical, Building, User } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
} as const;

export default function AuthSelectionPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="relative flex flex-1 flex-col items-center py-20">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/[0.04] via-background to-secondary/40" />
        <div className="absolute right-0 top-0 -z-10 h-[400px] w-[400px] rounded-full bg-primary/[0.06] blur-3xl" />

        <div className="container mx-auto px-4">
          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            animate="visible"
            className="mb-12 text-center"
          >
            <h1 className="mb-4 text-4xl font-extrabold tracking-tight lg:text-5xl">
              Sign In to AHI Portals
            </h1>
            <p className="mx-auto max-w-lg text-lg text-muted-foreground">
              Please select your role to proceed to the appropriate secure
              dashboard interface.
            </p>
          </motion.div>

          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {[
              {
                role: "Patient",
                desc: "Access your PEME progress and results.",
                icon: User,
                href: "/auth/patient/sign-in",
                color: "text-blue-600 bg-blue-100",
                shadow: "hover:shadow-blue-600/20",
              },
              {
                role: "Hospital Staff",
                desc: "Internal encoded workflow access.",
                icon: BriefcaseMedical,
                href: "/auth/staff/sign-in",
                color: "text-emerald-600 bg-emerald-100",
                shadow: "hover:shadow-emerald-600/20",
              },
              {
                role: "Agency / Client",
                desc: "View authorized employee medical results.",
                icon: Building,
                href: "/auth/agency/sign-in",
                color: "text-indigo-600 bg-indigo-100",
                shadow: "hover:shadow-indigo-600/20",
              },
            ].map((item, i) => (
              <motion.div
                key={item.role}
                custom={i + 1}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
              >
                <Link href={item.href} className="block h-full cursor-pointer">
                  <Card
                    className={`h-full border-2 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 ${item.shadow}`}
                  >
                    <CardContent className="flex h-full flex-col items-center p-8 text-center">
                      <div
                        className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${item.color}`}
                      >
                        <item.icon className="h-8 w-8" />
                      </div>
                      <h2 className="mb-2 text-xl font-bold">{item.role}</h2>
                      <p className="mb-6 flex-1 text-sm text-muted-foreground">
                        {item.desc}
                      </p>
                      <div className="flex items-center text-sm font-semibold text-primary">
                        Continue <ArrowRight className="ml-1 h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

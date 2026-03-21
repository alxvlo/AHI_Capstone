import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { hospitalProfile, serviceGroups } from "@/lib/content/public-site";
import {
  ArrowRight,
  CalendarCheck2,
  FileCheck2,
  FlaskConical,
  HeartPulse,
  ShieldPlus,
  ShipWheel,
  Stethoscope,
} from "lucide-react";

const serviceIcons = [
  Stethoscope,
  ShipWheel,
  CalendarCheck2,
  FlaskConical,
  HeartPulse,
];

export default function ServicesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/[0.04] via-background to-secondary/40" />
          <div className="container mx-auto px-4 py-20 md:py-24">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-primary">
              Services
            </p>
            <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight md:text-5xl">
              Public-facing service lines for PEME, diagnostics, and employer medical programs
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
              The official clinic website centers its services on workforce-oriented medical
              evaluations: pre-employment exams, sea-based screening, annual checkups,
              laboratory diagnostics, radiology, and supporting specialty tests.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="rounded-full px-6">
                <Link href="/contact">
                  Ask about scheduling <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild className="rounded-full px-6">
                <a href={hospitalProfile.officialWebsite} rel="noreferrer" target="_blank">
                  View official website
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="mb-10 max-w-3xl">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
              Service catalog
            </p>
            <h2 className="text-3xl font-bold">Major care areas now surfaced as dedicated frontend content</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {serviceGroups.map((service, index) => {
              const Icon = serviceIcons[index] ?? ShieldPlus;

              return (
                <Card key={service.title} className="border-2">
                  <CardContent className="p-7">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
                      {service.audience}
                    </p>
                    <h3 className="mb-3 text-2xl font-bold">{service.title}</h3>
                    <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                      {service.description}
                    </p>
                    <div className="space-y-3">
                      {service.items.map((item) => (
                        <div key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                          <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="bg-secondary/35">
          <div className="container mx-auto px-4 py-16">
            <div className="mb-10 max-w-3xl">
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
                Employer value
              </p>
              <h2 className="text-3xl font-bold">How the public site positions these services</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "Risk-focused screening",
                  description:
                    "PEME packages are presented as a way to help employers assess job fitness and reduce avoidable health and safety risks.",
                },
                {
                  title: "Custom package support",
                  description:
                    "The official site states that packages can be adjusted around age, role, duty, risk factors, and employer requirements.",
                },
                {
                  title: "Fast operational turnaround",
                  description:
                    "The public service pages state that many results can be released quickly, often within 24 hours depending on the examination mix.",
                },
              ].map((item) => (
                <Card key={item.title} className="border-2 bg-card/90">
                  <CardContent className="p-6">
                    <h3 className="mb-2 text-xl font-bold">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

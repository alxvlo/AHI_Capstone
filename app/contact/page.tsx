import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  hospitalProfile,
  preparationChecklist,
  visitChecklist,
} from "@/lib/content/public-site";
import {
  ArrowRight,
  Clock3,
  ExternalLink,
  FileCheck2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-secondary/40 via-background to-primary/[0.05]" />
          <div className="container mx-auto px-4 py-20 md:py-24">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-primary">
              Contact
            </p>
            <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight md:text-5xl">
              Contact details and visit guidance for American Hospital&apos;s public site
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
              This page surfaces the public location, phone numbers, email address,
              clinic hours, and preparation reminders already published by the clinic.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="rounded-full px-6">
                <a href={`mailto:${hospitalProfile.email}`}>
                  Email the clinic <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" asChild className="rounded-full px-6">
                <a href={hospitalProfile.officialWebsite} rel="noreferrer" target="_blank">
                  Official website <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Location",
                value: hospitalProfile.address,
                icon: MapPin,
              },
              {
                title: "Phone",
                value: hospitalProfile.phones.join(" | "),
                icon: Phone,
              },
              {
                title: "Email",
                value: hospitalProfile.email,
                icon: Mail,
              },
              {
                title: "Clinic hours",
                value: hospitalProfile.hours,
                icon: Clock3,
              },
            ].map((item) => (
              <Card key={item.title} className="border-2">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
                    {item.title}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-secondary/35">
          <div className="container mx-auto grid gap-6 px-4 py-16 lg:grid-cols-[0.95fr_1.05fr]">
            <Card className="border-2 bg-card/90">
              <CardContent className="p-8">
                <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
                  Before you visit
                </p>
                <h2 className="mb-5 text-2xl font-bold">Preparation checklist</h2>
                <div className="space-y-3">
                  {preparationChecklist.map((item) => (
                    <div key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                      <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 bg-card/90">
              <CardContent className="p-8">
                <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
                  Visit workflow
                </p>
                <h2 className="mb-5 text-2xl font-bold">Bring these with you</h2>
                <div className="space-y-3">
                  {visitChecklist.map((item) => (
                    <div key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-2xl bg-secondary/60 p-4 text-sm text-secondary-foreground">
                  For live scheduling, pricing, or employer quotation requests, the safest
                  source remains the clinic&apos;s official public website and front-desk
                  contact channels.
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button variant="outline" asChild className="rounded-full">
                    <Link href="/services">Review services</Link>
                  </Button>
                  <Button asChild className="rounded-full">
                    <a href={hospitalProfile.officialWebsite} rel="noreferrer" target="_blank">
                      Visit official site <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

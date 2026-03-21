import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  aboutHighlights,
  accreditationHighlights,
  historyMilestones,
  hospitalProfile,
  missionPoints,
  preparationChecklist,
  trustStats,
  visionStatement,
} from "@/lib/content/public-site";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Clock3,
  FileCheck2,
  HeartPulse,
  MapPin,
  ShieldCheck,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/[0.05] via-background to-accent/[0.12]" />
          <div className="container mx-auto px-4 py-20 md:py-24">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-primary">
              About American Hospital
            </p>
            <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight md:text-5xl">
              A public-facing clinic profile built around industrial medicine and workforce screening
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
              {hospitalProfile.publicName} ({hospitalProfile.name}) publicly presents itself
              as a clinic for pre-employment medical examinations, sea-based screening,
              annual exams, and employer-focused diagnostics in Intramuros, Manila.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="rounded-full px-6">
                <Link href="/services">
                  Browse services <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild className="rounded-full px-6">
                <Link href="/contact">Contact the clinic</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { ...trustStats[0], icon: Clock3 },
              { value: "1955", label: "Founding year noted publicly", icon: Building2 },
              { value: "DOH", label: "Public accreditation highlight", icon: ShieldCheck },
              { value: "Manila", label: "Intramuros clinic location", icon: MapPin },
            ].map((item) => (
              <Card key={item.label} className="border-2">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-primary">{item.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 pb-16">
          <div className="mb-10 max-w-3xl">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
              Why this matters
            </p>
            <h2 className="text-3xl font-bold">What the official public site says about the clinic</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {aboutHighlights.map((highlight) => (
              <Card key={highlight.title} className="border-2">
                <CardContent className="p-6">
                  <h3 className="mb-2 text-xl font-bold">{highlight.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {highlight.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-secondary/35">
          <div className="container mx-auto grid gap-6 px-4 py-16 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-2 bg-card/90">
              <CardContent className="p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <HeartPulse className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-widest text-primary">
                      Mission
                    </p>
                    <h2 className="text-2xl font-bold">Operational commitments</h2>
                  </div>
                </div>
                <div className="space-y-3">
                  {missionPoints.map((point) => (
                    <div key={point} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 bg-card/90">
              <CardContent className="p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-widest text-primary">
                      Vision
                    </p>
                    <h2 className="text-2xl font-bold">Long-term direction</h2>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {visionStatement}
                </p>
                <div className="mt-6 rounded-2xl bg-secondary/60 p-4 text-sm text-secondary-foreground">
                  The public site consistently positions the clinic around industrial and
                  maritime medicine, with employer and applicant screening as the primary
                  service context.
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="mb-10 max-w-3xl">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
              Timeline
            </p>
            <h2 className="text-3xl font-bold">A simplified history for the public-facing site</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {historyMilestones.map((milestone) => (
              <Card key={milestone.title} className="border-2">
                <CardContent className="p-6">
                  <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
                    {milestone.year}
                  </p>
                  <h3 className="mb-2 text-xl font-bold">{milestone.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {milestone.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-secondary/35">
          <div className="container mx-auto grid gap-6 px-4 py-16 lg:grid-cols-[1fr_1fr]">
            <Card className="border-2 bg-card/90">
              <CardContent className="p-8">
                <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
                  Accreditations
                </p>
                <h2 className="mb-5 text-2xl font-bold">Public trust markers</h2>
                <div className="space-y-3">
                  {accreditationHighlights.map((item) => (
                    <div key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 bg-card/90">
              <CardContent className="p-8">
                <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
                  Preparation
                </p>
                <h2 className="mb-5 text-2xl font-bold">Before an examination</h2>
                <div className="space-y-3">
                  {preparationChecklist.map((item) => (
                    <div key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </div>
                  ))}
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

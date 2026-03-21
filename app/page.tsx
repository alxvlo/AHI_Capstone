"use client";

import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import {
  aboutHighlights,
  hospitalProfile,
  publicNavLinks,
  serviceGroups,
  trustStats,
} from "@/lib/content/public-site";
import {
  Activity,
  ArrowRight,
  Award,
  BriefcaseMedical,
  Building,
  CalendarCheck,
  Clock,
  FileText,
  FlaskConical,
  MapPin,
  Phone,
  ShieldCheck,
  Ship,
  Stethoscope,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5 },
  }),
} as const;

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-background to-secondary/40" />
          <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-primary/[0.06] blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-[300px] w-[300px] rounded-full bg-accent/[0.08] blur-3xl" />
        </div>

        <div className="container mx-auto flex flex-col items-center px-4 py-20 text-center md:py-28">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm"
          >
            <Activity className="h-3.5 w-3.5 text-primary" />
            The Pioneer in Industrial Medicine
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mb-5 max-w-4xl text-4xl font-extrabold tracking-tight text-foreground md:text-5xl lg:text-6xl"
          >
            Complete Manpower{" "}
            <span className="text-gradient">Medical Evaluations</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mb-9 max-w-2xl text-lg leading-relaxed text-muted-foreground"
          >
            American Hospital Inc. publicly presents its services around PEME,
            sea-based screening, annual examinations, and diagnostics for
            employers and applicants seeking coordinated industrial-medicine care.
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mb-5 flex flex-wrap justify-center gap-3"
          >
            {!user && (
              <>
                <Button
                  size="lg"
                  asChild
                  className="rounded-full px-7 shadow-lg shadow-primary/25"
                >
                  <Link href="/auth/patient/sign-up">
                    Get Started <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="rounded-full px-7"
                >
                  <Link href="/auth">Sign In</Link>
                </Button>
              </>
            )}
            <Button
              size="lg"
              variant="ghost"
              asChild
              className="rounded-full px-7"
            >
              <Link href="/services">Explore Services</Link>
            </Button>
          </motion.div>

          <motion.p
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="max-w-3xl text-sm leading-relaxed text-muted-foreground"
          >
            Public clinic information is based on the official American
            Outpatient Clinic website and surfaced here as separate About,
            Services, and Contact pages for a more complete hospital-facing
            frontend.
          </motion.p>
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="container mx-auto grid grid-cols-2 divide-x md:grid-cols-4">
          {[
            { ...trustStats[0], icon: Clock },
            { value: "ISO 9001", label: "Certified quality system", icon: Award },
            { value: "1,000+", label: "Monthly PEMEs", icon: Users },
            { value: "10", label: "Exam departments", icon: Building },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="px-6 py-6 text-center"
            >
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-primary md:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <motion.div
          variants={fadeUp}
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
            What we offer
          </p>
          <h2 className="text-3xl font-bold md:text-4xl">Our Core Services</h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              icon: Stethoscope,
              title: serviceGroups[0].title,
              desc: serviceGroups[0].description,
              features: [
                { icon: Clock, text: "Structured manpower screening" },
                { icon: Users, text: "Individual and company packages" },
                { icon: ShieldCheck, text: "Regulatory-aligned PEME support" },
              ],
            },
            {
              icon: Ship,
              title: serviceGroups[1].title,
              desc: serviceGroups[1].description,
              features: [
                { icon: Clock, text: "Built for seafarer screening" },
                { icon: ShieldCheck, text: "DMW, DOH, and MARINA-aligned" },
                { icon: Users, text: "Supports shipping-line requirements" },
              ],
            },
            {
              icon: CalendarCheck,
              title: serviceGroups[2].title,
              desc: serviceGroups[2].description,
              features: [
                { icon: Clock, text: "Scheduled group bookings" },
                { icon: Users, text: "Hotel and office personnel" },
                { icon: ShieldCheck, text: "Customizable packages" },
              ],
            },
            {
              icon: FlaskConical,
              title: "Laboratory, Radiology, and Diagnostics",
              desc: "Clinical chemistry, hematology, imaging, ECG, pulmonary testing, and other specialty diagnostics support the screening workflow.",
              features: [
                { icon: Clock, text: "Clinical chemistry and hematology" },
                { icon: ShieldCheck, text: "Ultrasound and X-ray" },
                { icon: Users, text: "ECG, audiometry, and PFT support" },
              ],
            },
          ].map((service, i) => (
            <motion.div
              key={service.title}
              custom={i + 1}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <Card className="group relative overflow-hidden border-2 transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/[0.06]">
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/[0.06] transition-transform duration-500 group-hover:scale-150" />

                <CardContent className="relative p-7">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/25">
                    <service.icon className="h-7 w-7" />
                  </div>

                  <h3 className="mb-2 text-2xl font-bold">{service.title}</h3>
                  <p className="mb-5 leading-relaxed text-muted-foreground">
                    {service.desc}
                  </p>

                  <div className="space-y-2.5">
                    {service.features.map((feature) => (
                      <div
                        key={feature.text}
                        className="flex items-center gap-3 text-sm"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                          <feature.icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-muted-foreground">
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-secondary/40">
        <div className="container mx-auto px-4 py-20">
          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
              Why American Hospital
            </p>
            <h2 className="text-3xl font-bold md:text-4xl">
              Public information patients and employers look for first
            </h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {[
              { ...aboutHighlights[0], icon: BriefcaseMedical },
              { ...aboutHighlights[1], icon: FileText },
              {
                title: "Visit the clinic",
                description: hospitalProfile.address,
                icon: MapPin,
              },
              {
                title: "Reach the front desk",
                description: `${hospitalProfile.phones[0]} | ${hospitalProfile.phones[1]}`,
                icon: Phone,
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                custom={index + 1}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <Card className="h-full border-2 bg-card/80">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <motion.div
          variants={fadeUp}
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
            Explore more
          </p>
          <h2 className="text-3xl font-bold md:text-4xl">
            Separate pages for hospital information
          </h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {publicNavLinks.map((link, index) => (
            <motion.div
              key={link.href}
              custom={index + 1}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <Card className="h-full border-2 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10">
                <CardContent className="flex h-full flex-col p-6">
                  <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
                    {link.label}
                  </p>
                  <h3 className="mb-2 text-2xl font-bold">
                    {link.label === "About"
                      ? "Learn the clinic story and credentials"
                      : link.label === "Services"
                        ? "Browse PEME, diagnostics, and annual exams"
                        : "Find contact details and visit guidance"}
                  </h3>
                  <p className="mb-6 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {link.label === "About"
                      ? "Review the clinic background, mission, vision, service focus, and public accreditation highlights."
                      : link.label === "Services"
                        ? "See the major examination lines, package coverage, and diagnostic capabilities presented on the official public site."
                        : "Get the Manila address, working hours, phone numbers, email address, and preparation reminders before a visit."}
                  </p>
                  <Button variant="outline" asChild className="rounded-full">
                    <Link href={link.href}>
                      Open {link.label} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}

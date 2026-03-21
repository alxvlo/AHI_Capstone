import Link from "next/link";
import { SiteLogo } from "@/components/layout/site-logo";
import { Clock, ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import {
  hospitalProfile,
  publicNavLinks,
} from "@/lib/content/public-site";

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="mb-4">
              <SiteLogo variant="footer" />
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              {hospitalProfile.overview}
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-widest text-foreground">
              Explore
            </h4>
            <div className="space-y-3 text-sm text-muted-foreground">
              {publicNavLinks.map((link) => (
                <p key={link.href}>
                  <Link
                    className="transition-colors hover:text-foreground"
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                </p>
              ))}
              <p>
                <a
                  className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
                  href={hospitalProfile.officialWebsite}
                  rel="noreferrer"
                  target="_blank"
                >
                  Official website <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </p>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-widest text-foreground">
              Contact
            </h4>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-primary" />
                <span>{hospitalProfile.phones.join(" | ")}</span>
              </p>
              <p className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-primary" />
                <span>{hospitalProfile.email}</span>
              </p>
              <p className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                <span>{hospitalProfile.address}</span>
              </p>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-widest text-foreground">
              Hours
            </h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-primary" />
                {hospitalProfile.hours}
              </p>
              <div className="space-y-1 pt-2">
                {hospitalProfile.accreditations.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
          © 2026 American Hospital Inc. All rights reserved. | DOH Accreditation No. 13-010-17-MF-2 | ISO 9001:2015 Certified
        </div>
      </div>
    </footer>
  );
}

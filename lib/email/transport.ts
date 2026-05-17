import nodemailer from "nodemailer";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `Email config error: ${name} is required. ` +
        `Set it in .env.local (see .env.local.example).`
    );
  }
  return value;
}

export function buildEmailTransport() {
  const host = requireEnv("SMTP_HOST");
  const port = Number(requireEnv("SMTP_PORT"));
  const user = requireEnv("SMTP_USER");
  const pass = requireEnv("SMTP_PASS");
  requireEnv("EMAIL_FROM");

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export function getEmailFrom(): string {
  return requireEnv("EMAIL_FROM");
}

export function getReleasingNotificationEmail(): string | null {
  const value = process.env.RELEASING_NOTIFICATION_EMAIL;
  return value && value.trim().length > 0 ? value : null;
}

export function getPortalBaseUrl(): string {
  return process.env.PORTAL_BASE_URL ?? "http://localhost:3000";
}

import Image from "next/image";
import Link from "next/link";

type SiteLogoProps = {
  href?: string;
  variant?: "navbar" | "footer";
};

const logoStyles = {
  navbar: "w-[154px] sm:w-[176px] md:w-[210px]",
  footer: "w-[190px] sm:w-[220px]",
} as const;

export function SiteLogo({
  href = "/",
  variant = "navbar",
}: SiteLogoProps) {
  const image = (
    <Image
      alt="American Hospital Inc. logo"
      className={`h-auto ${logoStyles[variant]}`}
      height={735}
      priority={variant === "navbar"}
      src="/branding/ahi-logo.svg"
      width={4203}
    />
  );

  return href ? <Link href={href}>{image}</Link> : image;
}

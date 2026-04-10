"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const FOCUSABLE_SELECTOR =
  "a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex='-1'])";

type ActionPanelProps = {
  open: boolean;
  title: string;
  description?: string;
  closeHref: string;
  closeLabel?: string;
  footer?: ReactNode;
  children: ReactNode;
};

export function ActionPanel({
  open,
  title,
  description,
  closeHref,
  closeLabel = "Close",
  footer,
  children,
}: ActionPanelProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const panelElement = panelRef.current;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const initialFocusable = panelElement?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    initialFocusable?.focus();

    if (!initialFocusable) {
      panelElement?.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        router.push(closeHref);

        return;
      }

      if (event.key !== "Tab" || !panelElement) {
        return;
      }

      const focusableElements = Array.from(
        panelElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((element) => element.tabIndex !== -1 && !element.hasAttribute("disabled"));

      if (focusableElements.length === 0) {
        event.preventDefault();
        panelElement.focus();

        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [closeHref, open, router]);

  if (!open) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => router.push(closeHref)}
        className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
        aria-label="Close action panel"
      />

      <aside
        ref={panelRef}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l bg-background shadow-xl"
        aria-modal="true"
        role="dialog"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <header className="border-b px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-lg font-semibold tracking-tight">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>

            <Button variant="outline" size="sm" asChild>
              <Link href={closeHref}>{closeLabel}</Link>
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? <footer className="border-t px-5 py-4">{footer}</footer> : null}
      </aside>
    </>
  );
}

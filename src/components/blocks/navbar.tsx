import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { BUSINESS } from "@/data/business";
import { cn } from "@/lib/utils";

/**
 * Floating pill navbar — the Ecodrive shape, but this is a one-page landing so
 * every link is an in-page anchor rather than a route. Kept deliberately short:
 * on a paid-traffic page every extra nav item is another way to leave the
 * funnel without converting.
 *
 * Hydrated client:load, not client:only — the markup ships in the initial HTML
 * so the header is never blank; only the scrolled-state styling waits for JS.
 */
const LINKS = [
  { label: "Paket & priser", href: "#paket" },
  { label: "Så går det till", href: "#process" },
  { label: "Omdömen", href: "#omdomen" },
  { label: "Vanliga frågor", href: "#faq" },
];

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile sheet on Escape, and whenever the viewport grows past the
  // breakpoint where the sheet stops being reachable.
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setIsMenuOpen(false);
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onChange);
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onChange);
    };
  }, [isMenuOpen]);

  return (
    <header
      className={cn(
        // 980px, not 880: at the narrower width the desktop row squeezed the
        // brand into an ellipsis and wrapped "Paket & priser" onto two lines.
        "fixed left-1/2 z-50 w-[min(94%,980px)] -translate-x-1/2 rounded-4xl border transition-all duration-300",
        "top-4 lg:top-8",
        scrolled
          ? "bg-background/80 border-white/10 backdrop-blur-md"
          : "bg-background/50 border-white/5 backdrop-blur-sm",
      )}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-3 md:px-6">
        <a
          href="#top"
          className="flex shrink-0 items-center gap-2"
          aria-label={`${BUSINESS.name} — till toppen`}
        >
          {/* Wordmark, not a logo file: the client has not supplied a mark, and
              a text lockup beats a placeholder box in the header. Never
              truncated — an ellipsised brand name is worse than a tighter nav. */}
          <span className="font-display text-sm leading-none font-bold tracking-tight whitespace-nowrap text-white sm:text-base">
            Hyper
            <span className="text-primary"> Detailing</span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap text-white/75 transition-colors hover:bg-white/5 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* The phone pill that sat beside the CTA is gone by design: every
            enquiry goes through the form, so the navbar offers exactly one
            action. */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            asChild
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-4 font-semibold"
          >
            <a href="#boka">
              <span className="sm:hidden">Boka</span>
              <span className="hidden sm:inline">Boka tid</span>
            </a>
          </Button>

          <button
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="relative flex size-8 text-white/70 lg:hidden"
          >
            <span className="sr-only">
              {isMenuOpen ? "Stäng menyn" : "Öppna menyn"}
            </span>
            <span className="absolute top-1/2 left-1/2 block w-[18px] -translate-x-1/2 -translate-y-1/2">
              <span
                aria-hidden="true"
                className={cn(
                  "absolute block h-0.5 w-full rounded-full bg-current transition duration-500 ease-in-out",
                  isMenuOpen ? "rotate-45" : "-translate-y-1.5",
                )}
              />
              <span
                aria-hidden="true"
                className={cn(
                  "absolute block h-0.5 w-full rounded-full bg-current transition duration-500 ease-in-out",
                  isMenuOpen && "opacity-0",
                )}
              />
              <span
                aria-hidden="true"
                className={cn(
                  "absolute block h-0.5 w-full rounded-full bg-current transition duration-500 ease-in-out",
                  isMenuOpen ? "-rotate-45" : "translate-y-1.5",
                )}
              />
            </span>
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={cn(
          "bg-background fixed inset-x-0 top-[calc(100%+0.75rem)] flex flex-col rounded-2xl border p-5 transition-all duration-300 ease-in-out lg:hidden",
          isMenuOpen
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-4 opacity-0",
        )}
      >
        <nav className="divide-border flex flex-col divide-y">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className="py-3.5 text-base font-medium text-white transition-colors first:pt-0 last:pb-0 hover:text-white/70"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
};

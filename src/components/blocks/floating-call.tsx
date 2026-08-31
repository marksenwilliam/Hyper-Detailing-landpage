import { useEffect, useState } from "react";

import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Floating CTA pill — frosted glass, fixed in the lower corner, linking
 * STRAIGHT to the lead form at #boka.
 *
 * It used to open a dialog offering every contact channel (call, SMS, form).
 * The channels are gone by design: every enquiry now goes through the form, so
 * a lead always arrives as a tagged GHL contact with attribution — a call or
 * an SMS arrived as nothing. One click, no intermediate step.
 *
 * It stays hidden while the hero fills the viewport (the hero already has its
 * own CTAs) and fades in once the second block scrolls into view.
 */
export const FloatingCall = () => {
  const [pastHero, setPastHero] = useState(false);

  // Observe the page's SECOND section block (the hero is the first). The pill
  // appears as soon as any part of it is on screen OR has been scrolled past,
  // so it never flickers off further down the page.
  useEffect(() => {
    const main = document.querySelector("main");
    const blocks = main
      ? Array.from(main.querySelectorAll<HTMLElement>(":scope > div > *"))
      : [];
    const second = blocks[1];
    if (!second) {
      setPastHero(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      setPastHero(entry.isIntersecting || entry.boundingClientRect.top < 0);
    });
    io.observe(second);
    return () => io.disconnect();
  }, []);

  return (
    <a
      href="#boka"
      aria-label="Till bokningsformuläret"
      aria-hidden={!pastHero}
      tabIndex={pastHero ? undefined : -1}
      className={cn(
        "group fixed end-5 bottom-5 z-40 inline-flex items-center gap-2 overflow-hidden rounded-full border border-white/20 bg-white/5 px-5 py-3.5 text-sm font-semibold tracking-tight text-white shadow-xl shadow-black/25 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:bg-white/10 lg:end-8 lg:bottom-8",
        !pastHero && "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/20 via-transparent to-transparent opacity-50"
      />
      <span className="relative drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
        Kontakta oss
      </span>
      <ArrowRight
        className="relative size-4 transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </a>
  );
};

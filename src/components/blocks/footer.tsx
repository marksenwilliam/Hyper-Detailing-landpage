import { ArrowRight } from "lucide-react";

import { ADDRESS_ONELINE, BUSINESS } from "@/data/business";

/**
 * Footer — a last conversion prompt rather than a sitemap.
 *
 * On a one-page landing there is nothing to navigate to, so the old link list
 * was just offering people ways to leave. A visitor who has scrolled this far
 * has read the offer and the FAQ and is either going to enquire or going to
 * call; those are the only two things here.
 *
 * The legal line below them stays. The consent checkbox on the form links to
 * the integritetspolicy, and a lead-gen destination that Meta cannot find a
 * privacy policy on risks the ad account — so it is not optional decoration.
 */
export function Footer() {
  return (
    <footer className="px-5 pt-20 pb-[110px] md:px-8">
      <div className="container flex flex-col items-center gap-10 text-center">
        <div className="max-w-xl">
          <h2 className="text-2xl font-bold tracking-tight text-balance md:text-4xl">
            Redo att göra något bra för bilen?
          </h2>
          <p className="text-muted-foreground mt-4 leading-relaxed text-balance">
            Fyll i formuläret så hör vi av oss inom 24 timmar och bekräftar tid
            och pris för just din bil.
          </p>
        </div>

        {/* One route, not two: the phone button that shared this row is gone
            by design — every enquiry goes through the form. Since the
            2026-08-23 rebuild this footer only renders on the sub-pages
            (integritet/tack/404), where no #boka anchor exists — the button
            leads back to the landing page and its CTA:er. */}
        <div className="flex w-full max-w-lg flex-col items-stretch gap-3">
          <a
            href="/"
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex h-14 items-center justify-center gap-2 rounded-full px-8 text-base font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Hämta erbjudandet
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        </div>

        <div className="text-muted-foreground mt-4 flex flex-col items-center gap-2 border-t border-white/10 pt-8 text-xs">
          <p className="text-foreground font-display text-sm font-semibold">
            {BUSINESS.name}
          </p>
          <a
            href={BUSINESS.maps}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-75"
          >
            {ADDRESS_ONELINE}
          </a>
          <p>
            Org.nr {BUSINESS.orgnr} ·{" "}
            <a
              href="/integritet"
              className="underline underline-offset-4 transition-opacity hover:opacity-75"
            >
              Integritetspolicy & cookies
            </a>
          </p>
          <p>
            © {new Date().getFullYear()} {BUSINESS.name}
          </p>
        </div>
      </div>
    </footer>
  );
}

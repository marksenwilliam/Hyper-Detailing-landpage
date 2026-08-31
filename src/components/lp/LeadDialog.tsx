import { useEffect, useId, useRef, useState } from "react";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

import {
  LACKERING,
  LACKERING_BONUS,
  LACKSKYDD_TILLVAL,
  discountLabel,
} from "@/data/packages";
import { CONSENT_COPY_VERSION, CONSENT_TEXT } from "@/data/site";
import { formatKr, formatSek } from "@/lib/utils";

const TURNSTILE_SITE_KEY = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as
  | string
  | undefined;

type Status = "idle" | "submitting" | "success" | "error";

/** Same shape the endpoint validates against, so the two agree on what passes. */
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/** ["a","b","c"] -> "a, b och c" */
const listSv = (items: string[]) =>
  items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} och ${items[items.length - 1]}`;

/**
 * The lead dialog — the popup the page's four CTA buttons open, and the ONLY
 * JavaScript island on the landing page.
 *
 * It renders a native <dialog> (closed on the server, so SSR ships nothing
 * visible) and listens for clicks on any [data-open-lead] element — the CTA
 * buttons are plain static HTML (see CtaButton.astro), so they cost no JS and
 * can never render before the page does.
 *
 * TWO STEPS (client instruction 2026-08-23, restoring the upsell the rebuild
 * had dropped):
 *   Steg 1 — the offer restated (heading, 🎁 bonus, urgency line, price with
 *            its anchor) and the five required fields: förnamn, efternamn,
 *            telefon, mejl, registreringsnummer. "Nästa" is a real submit
 *            button, so Enter advances; it validates the fields before
 *            switching and nothing is sent yet.
 *            (The rebuild brief capped the form at three required fields and
 *            made reg_nr optional; the client overrode both on 2026-08-23,
 *            returning to the previous form's field set. Qualified leads beat
 *            raw volume for this shop — the follow-up call needs the plate.)
 *   Steg 2 — the ONE upsell: "Vill du lägga till följande?" over the polering
 *            card, JA/NEJ (required, NO preselection — enforced in onSubmit),
 *            the live total with a receipt of the cart above it, consent,
 *            Turnstile, and the actual "Hämta erbjudandet".
 * Both steps live in ONE <form>; switching only toggles which half renders, so
 * field state survives going back and forth. Focus moves to the incoming
 * step's heading, for the same reason the success panel takes focus.
 *
 * CONTRACT with /api/lead (do not rename): first_name, last_name, phone,
 * email, reg_nr, paket, tillval, consent, consent_text_version, submitted_at,
 * page_url, source, event_id, fbp, fbc, website_hp, turnstile_token + UTM
 * keys. Förnamn and efternamn are separate inputs posting straight to
 * first_name/last_name — the endpoint 400s without both, and splitting one
 * combined field would have to guess where a double first name ends. reg_nr is
 * required on the form but deliberately NOT a 400 server-side: a visitor on a
 * page cached from before the field existed would otherwise lose a real, paid
 * lead over something the shop can ask for on the phone. car_model is no
 * longer collected; the endpoint still accepts it if it is ever reinstated.
 *
 * TRACKING (must not break): on a successful submit the browser pixel fires
 * fbq('track', 'Lead') with an eventID that the server-side Conversions API
 * event (sent by /api/lead) shares, so Meta deduplicates the pair. The `value`
 * MUST equal what the server computes — package price plus the tillval when
 * JA — or value-based bidding optimises on whichever copy won the dedup.
 * PageView fires from BaseHead.astro on load, untouched by this component.
 *
 * Consent stays: it is a GDPR requirement and a hard server-side gate in
 * /api/lead — the proven structure's "max 3 fält" counts input fields, not the
 * legal checkbox.
 */
export const LeadDialog = () => {
  const uid = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLParagraphElement>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [regNr, setRegNr] = useState("");
  // null = not answered yet. The JA/NEJ choice is REQUIRED with no
  // preselection: a default answer would make the upsell statistics
  // meaningless and could sell someone a tillval they never actively chose.
  const [tillval, setTillval] = useState<boolean | null>(null);
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  // Bumped on every failed attempt and used as the alert's key, so a repeated
  // identical message still remounts and gets announced by screen readers.
  const [attempt, setAttempt] = useState(0);
  // Whether the current pointer gesture began on the backdrop — see the
  // onPointerDown/onClick pair on the <dialog>.
  const pointerDownOnBackdrop = useRef(false);

  const submitting = status === "submitting";

  // The CTA buttons are static HTML; this is the single wire between them and
  // the dialog. Delegated so a button anywhere on the page — including any
  // added later — opens the same dialog.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const trigger = (e.target as Element | null)?.closest?.(
        "[data-open-lead]",
      );
      if (!trigger) return;
      e.preventDefault();
      const dialog = dialogRef.current;
      if (!dialog || dialog.open) return;
      dialog.showModal();
      // Native <dialog> does not lock the page behind it.
      document.body.style.overflow = "hidden";
      // Focus the first field so a phone visitor can start typing immediately.
      requestAnimationFrame(() => nameInputRef.current?.focus());
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Restore scrolling on ANY close (Escape, close button, backdrop) — the
  // native "close" event fires for all of them.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      document.body.style.overflow = "";
    };
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  // bfcache repair. The layout's pageshow script dispatches a SYNTHETIC
  // Escape, but a native <dialog> only closes on a trusted one — so if the
  // page is snapshotted with the dialog open, a back/forward restore would
  // leave it open while the layout's fallback clears the scroll lock under
  // it. Closing it ourselves on a persisted pageshow keeps the two in sync
  // (close fires the handler above, which restores overflow).
  useEffect(() => {
    const onPageshow = (e: PageTransitionEvent) => {
      if (e.persisted && dialogRef.current?.open) dialogRef.current.close();
    };
    window.addEventListener("pageshow", onPageshow);
    return () => window.removeEventListener("pageshow", onPageshow);
  }, []);

  // On success the form unmounts and the confirmation takes its place; move
  // focus there so keyboard and screen-reader users hear what happened.
  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  // Same reasoning on a step switch: half the form just unmounted. The mounted
  // guard is load-bearing — without it this fires on first render too and
  // steals focus from the name field the open handler just focused.
  const steppedRef = useRef(false);
  useEffect(() => {
    if (!steppedRef.current) {
      steppedRef.current = true;
      return;
    }
    stepHeadingRef.current?.focus();
  }, [step]);

  // Which ad brought the visitor here — captured into sessionStorage by
  // UtmCapture in the layout, read here so it survives until submit.
  const [attribution, setAttribution] = useState<Record<string, string>>({});
  useEffect(() => {
    const keys = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "fbclid",
    ];
    const out: Record<string, string> = {};
    try {
      for (const k of keys) {
        const v = sessionStorage.getItem(k);
        if (v) out[k] = v;
      }
    } catch {
      /* private mode — attribution falls back to "direct" server-side */
    }
    setAttribution(out);
  }, []);

  const close = () => dialogRef.current?.close();

  const fail = (msg: string) => {
    setErrorMsg(msg);
    setStatus("error");
    setAttempt((a) => a + 1);
  };

  /**
   * Ett rättat fält ska inte lämna kvar ett rött fel om just det fältet —
   * felen pekar ut fält vid namn ("Fyll i registreringsnummer"), så ett
   * kvarstående meddelande läses som att rättningen inte togs emot. Felet
   * kommer tillbaka direkt vid nästa submit om något fortfarande saknas.
   */
  const onField =
    (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      if (status === "error") {
        setStatus("idle");
        setErrorMsg("");
      }
    };

  // The cart total, and the value both Meta events must agree on.
  const cartValue = LACKERING.price + (tillval === true ? LACKSKYDD_TILLVAL.price : 0);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Steg 1: "Nästa" submits the form (so Enter works) but only validates the
    // contact fields and advances — nothing is sent yet.
    if (step === 1) {
      // Name the fields that are actually missing. The form carries noValidate,
      // so the browser's own bubbles never appear and this message is the only
      // thing telling the visitor what to fix — "fyll i formuläret" would leave
      // them hunting across five fields.
      const missing = [
        !firstName.trim() && "förnamn",
        !lastName.trim() && "efternamn",
        !phone.trim() && "telefonnummer",
        !email.trim() && "mejladress",
        !regNr.trim() && "registreringsnummer",
      ].filter((f): f is string => Boolean(f));

      if (missing.length) {
        fail(`Fyll i ${listSv(missing)} så vi kan höra av oss.`);
        return;
      }
      if (!isEmail(email.trim())) {
        fail("Kontrollera mejladressen — den ser inte ut att vara komplett.");
        return;
      }
      setErrorMsg("");
      setStatus("idle");
      setStep(2);
      return;
    }

    // Steg 2: the real submit. The tillval question comes first — it sits
    // above the consent box, so the errors appear in visual order.
    if (tillval === null) {
      fail(
        `Välj "Ja, lägg till" eller "Nej tack" på frågan om ${LACKSKYDD_TILLVAL.name.toLowerCase()}.`,
      );
      return;
    }
    if (!consent) {
      fail("Du behöver godkänna att vi får kontakta dig om din förfrågan.");
      return;
    }
    if (TURNSTILE_SITE_KEY && !token) {
      fail("Bekräfta att du inte är en robot och försök igen.");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");

    // One id shared by the browser pixel and the server-side Conversions API
    // call (see /api/lead), so Meta can deduplicate the pair.
    const eventId = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const cookie = (name: string) =>
      document.cookie
        .split("; ")
        .find((c) => c.startsWith(`${name}=`))
        ?.slice(name.length + 1) || undefined;

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone,
          email,
          reg_nr: regNr.trim(),
          paket: LACKERING.id,
          // Guarded above — null cannot reach this line, so the payload always
          // carries a real boolean and the endpoint writes "JA"/"NEJ".
          tillval: tillval === true,
          consent,
          consent_text_version: CONSENT_COPY_VERSION,
          submitted_at: new Date().toISOString(),
          page_url: window.location.href,
          source: "hyper-lackering-lp",
          event_id: eventId,
          fbp: cookie("_fbp"),
          fbc: cookie("_fbc"),
          website_hp: honeypot,
          turnstile_token: token,
          ...attribution,
        }),
      });
      if (!res.ok) throw new Error("request_failed");

      // Browser-side Meta Lead event. fbq is undefined until a pixel id is
      // configured — then this is a no-op rather than a crash.
      const fbq = (window as unknown as { fbq?: (...a: unknown[]) => void })
        .fbq;
      if (typeof fbq === "function") {
        fbq(
          "track",
          "Lead",
          {
            content_name: "hyper-lackering-lp",
            // Same figure /api/lead sends to the Conversions API (package plus
            // the tillval on a JA) — the two deduplicate on eventID and must
            // agree.
            value: cartValue,
            currency: "SEK",
          },
          { eventID: eventId },
        );
      }

      setStatus("success");
    } catch {
      fail("Något gick fel. Vänta en stund och försök igen.");
      // Turnstile tokens are single-use — get a fresh one for the retry.
      turnstileRef.current?.reset();
      setToken("");
    }
  };

  const fieldClass =
    "w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-[15px] text-white placeholder-white/35 transition-colors focus:border-primary/60 focus:outline-none disabled:opacity-60";
  const labelClass = "mb-1.5 block text-sm font-medium text-white/80";
  const stepLabelClass =
    "text-muted-foreground font-mono text-[11px] font-medium tracking-wider uppercase focus:outline-none";
  // The JA/NEJ pills. The radio itself is sr-only, so the checked and focus
  // styling must come from the label via :has() — without the focus ring a
  // keyboard user would tab into an invisible control.
  const pillClass =
    "flex cursor-pointer items-center justify-center rounded-xl border border-white/12 px-3 py-2.5 text-sm font-medium text-white/70 transition-colors select-none " +
    "has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-white " +
    "has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-transparent " +
    "has-[:disabled]:cursor-default has-[:disabled]:opacity-60";

  // The consent copy comes from CONSENT_TEXT — the exact string whose version
  // (CONSENT_COPY_VERSION) is stamped on every lead as proof of wording. The
  // policy link is injected around the word rather than hard-coding a second
  // copy of the sentence that could silently drift from the versioned one.
  const [consentBefore, ...consentRest] = CONSENT_TEXT.split("integritetspolicyn");
  const consentAfter = consentRest.join("integritetspolicyn");

  // Erbjudandet som rubrik. Deklarerad en gång och renderad i två skepnader
  // (synlig på steg 1 / sr-only på steg 2), så de aldrig kan säga olika.
  const headingText = (
    <>
      <span className="text-primary">
        {discountLabel(LACKERING)} rabatt!
      </span>{" "}
      Lackering per detalj
    </>
  );
  /** Steg 2 leder med "STEG 2 AV 2 / Tillbaka" i stället för rubrik + kryss. */
  const hideHeader = step === 2 && status !== "success";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${uid}-title`}
      className="surface-card m-auto w-[min(94vw,28rem)] rounded-3xl border border-white/15 p-0 text-white shadow-2xl backdrop:bg-black/70"
      onPointerDown={(e) => {
        // Remember where the gesture STARTED. A click's target is the common
        // ancestor of mousedown and mouseup — selecting text in a field and
        // releasing over the backdrop would otherwise read as a backdrop
        // click and close the dialog mid-edit.
        pointerDownOnBackdrop.current = e.target === dialogRef.current;
      }}
      onClick={(e) => {
        // A click on the backdrop hits the <dialog> element itself.
        if (
          e.target === dialogRef.current &&
          pointerDownOnBackdrop.current &&
          !submitting
        )
          close();
      }}
      onCancel={(e) => {
        // Escape must not abandon the dialog mid-submit — the close button and
        // the backdrop are already guarded; this guards the keyboard path.
        if (submitting) e.preventDefault();
      }}
    >
      <div className="max-h-[88dvh] overflow-y-auto p-6 md:p-7">
        {/*
          Rubriken och stäng-krysset döljs på steg 2 (klientinstruktion
          2026-08-23) — där leder "STEG 2 AV 2 / Tillbaka" i stället.

          Rubriken tas INTE bort ur DOM:en, den blir sr-only: <dialog> pekar sitt
          aria-labelledby hit, och utan elementet tappar dialogen sitt
          tillgängliga namn helt. Steg 2 går fortfarande att stänga med Escape,
          klick utanför, eller via Tillbaka till steg 1 där krysset finns.
        */}
        {hideHeader ? (
          <h2 id={`${uid}-title`} className="sr-only">
            {headingText}
          </h2>
        ) : (
        <div className="flex items-start justify-between gap-4">
          <h2
            id={`${uid}-title`}
            className="font-display text-xl leading-tight font-bold tracking-tight text-balance md:text-2xl"
          >
            {headingText}
          </h2>
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            aria-label="Stäng"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-60"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
              className="size-4"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        )}

        {status === "success" ? (
          <div
            ref={successRef}
            role="status"
            tabIndex={-1}
            className="mt-5 focus-visible:outline-none"
          >
            <p className="font-display text-lg font-bold text-white">
              Tack — vi har fått din förfrågan!
            </p>
            <p className="text-muted-foreground mt-2 leading-relaxed">
              Vi ringer upp dig inom 24 timmar och går igenom exakt vad som
              ingår — du bestämmer sedan.
            </p>
            <button
              type="button"
              onClick={close}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 w-full rounded-full px-6 py-3 text-base font-semibold transition-colors"
            >
              Stäng
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="mt-4">
            {/* Honeypot: zero-size box, invisible to humans, tempting to bots —
                a filled value makes the endpoint fake a success. Rendered on
                both steps so it is always in the posted document. */}
            <div className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
              <label>
                Lämna detta fält tomt
                <input
                  type="text"
                  name="website_hp"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </label>
            </div>

            {step === 1 ? (
              <>
                <p ref={stepHeadingRef} tabIndex={-1} className={stepLabelClass}>
                  Steg 1 av 2
                </p>

                {/* Gåvraden ärvdes från mallen, där Diamant-paketet hade en
                    gratis motortvätt på köpet. Hyper har ingen motsvarande gåva,
                    så LACKERING_BONUS är null och raden renderas inte — en
                    påhittad gåva är ett påhittat värde. Fylls konstanten i
                    dyker raden upp igen av sig själv. */}
                {LACKERING_BONUS && (
                  <p className="mt-3 text-sm font-semibold text-white">
                    🎁 GRATIS {LACKERING_BONUS.name.toLowerCase()} (värde{" "}
                    {formatKr(LACKERING_BONUS.value)})
                  </p>
                )}

                <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-center text-sm font-bold tracking-wide text-red-400">
                  ⏳ Tidsbegränsat erbjudande ⏳
                </p>

                {/* Varje prisdel är sin egen nowrap-enhet, så raden bryts
                    mellan nu-priset och ankaret — aldrig mitt i "4 300 kr)". */}
                <p className="text-muted-foreground mt-3 text-sm">
                  <span className="whitespace-nowrap">
                    Just nu från{" "}
                    <span className="font-semibold text-white">
                      {formatKr(LACKERING.price)}
                    </span>{" "}
                    {LACKERING.unit}
                  </span>{" "}
                  <span className="whitespace-nowrap">
                    (ordinarie pris från{" "}
                    <span className="line-through">
                      {formatKr(LACKERING.originalPrice)}
                    </span>
                    )
                  </span>
                </p>

                <div className="mt-5 space-y-4">
                  {/* Förnamn och efternamn som egna fält — de posta(s) som
                      first_name/last_name, precis vad endpointen vill ha, så
                      ingen gissning behövs om var förnamnet slutar (dubbla
                      förnamn, efternamn i två ord). Sida vid sida först från
                      sm; på telefon får de var sin rad. */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`${uid}-first`} className={labelClass}>
                        Förnamn <span className="text-primary">*</span>
                      </label>
                      <input
                        ref={nameInputRef}
                        id={`${uid}-first`}
                        name="first_name"
                        type="text"
                        required
                        autoComplete="given-name"
                        placeholder="Anna"
                        className={fieldClass}
                        value={firstName}
                        onChange={onField(setFirstName)}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label htmlFor={`${uid}-last`} className={labelClass}>
                        Efternamn <span className="text-primary">*</span>
                      </label>
                      <input
                        id={`${uid}-last`}
                        name="last_name"
                        type="text"
                        required
                        autoComplete="family-name"
                        placeholder="Andersson"
                        className={fieldClass}
                        value={lastName}
                        onChange={onField(setLastName)}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`${uid}-phone`} className={labelClass}>
                      Telefonnummer <span className="text-primary">*</span>
                    </label>
                    <input
                      id={`${uid}-phone`}
                      name="phone"
                      type="tel"
                      required
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="070-123 45 67"
                      className={fieldClass}
                      value={phone}
                      onChange={onField(setPhone)}
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label htmlFor={`${uid}-email`} className={labelClass}>
                      Mejladress <span className="text-primary">*</span>
                    </label>
                    <input
                      id={`${uid}-email`}
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="anna@exempel.se"
                      className={fieldClass}
                      value={email}
                      onChange={onField(setEmail)}
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label htmlFor={`${uid}-regnr`} className={labelClass}>
                      Registreringsnummer <span className="text-primary">*</span>
                    </label>
                    {/* Versalerna är kosmetiska (CSS), så vad besökaren än
                        skriver skickas oförändrat; endpointen normaliserar för
                        GHL. INGEN formatvalidering — personliga skyltar finns,
                        och att blockera ett betalt lead över skyltformat kostar
                        mer än ett stavfel gör. */}
                    <input
                      id={`${uid}-regnr`}
                      name="reg_nr"
                      type="text"
                      required
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      maxLength={12}
                      placeholder="ABC 123"
                      className={`${fieldClass} uppercase placeholder:normal-case`}
                      value={regNr}
                      onChange={onField(setRegNr)}
                      disabled={submitting}
                    />
                  </div>
                </div>

                {status === "error" && errorMsg && (
                  <p
                    key={attempt}
                    role="alert"
                    className="text-destructive mt-4 text-sm font-medium"
                  >
                    {errorMsg}
                  </p>
                )}

                {/* type=submit so Enter in any field advances; onSubmit routes
                    on `step` and nothing is posted from here. */}
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 mt-5 w-full rounded-full px-6 py-3 text-base font-bold transition-colors"
                >
                  Nästa
                </button>

                <p className="mt-3 text-center text-xs font-medium text-white/70">
                  🔒 Dina uppgifter är 100&nbsp;% säkrade
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p
                    ref={stepHeadingRef}
                    tabIndex={-1}
                    className={stepLabelClass}
                  >
                    Steg 2 av 2
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg("");
                      setStatus("idle");
                      // The widget unmounts with the step; a kept token would
                      // outlive Cloudflare's ~300 s TTL with no onExpire left
                      // to clear it, and then pass the client gate as a dead
                      // token.
                      setToken("");
                      setStep(1);
                    }}
                    disabled={submitting}
                    className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-white disabled:opacity-60"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="size-3.5"
                    >
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Tillbaka
                  </button>
                </div>

                {/* Merförsäljningen, i prislistans radanatomi: namn, underrad,
                    pris till höger. Claim rule 4 — 8-årslöftet är Hypers eget
                    och får bara återges som deras prislista formulerar det,
                    vilket LACKSKYDD_TILLVAL.description gör. Tillvalet ingår
                    INTE i kampanjen och visas därför till ordinarie pris. */}
                <p
                  id={`${uid}-addon-h`}
                  className="font-display mt-4 text-lg font-bold tracking-tight text-white"
                >
                  Vill du lägga till följande?
                </p>

                <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                  {/* Namn och pris delar en flex-wrap-rad; ryms de inte bredvid
                      varandra hamnar priset på egen rad. Beskrivningen ligger
                      UNDER båda och får hela kolumnbredden — låg man priset i
                      en egen sidokolumn pressades beskrivningen ihop till två
                      ord per rad på 390 px. */}
                  <div className="flex items-start gap-3 px-4 py-4">
                    <img
                      src="/images/form/keramiskt-lackskydd.webp"
                      alt=""
                      loading="lazy"
                      decoding="async"
                      width={256}
                      height={256}
                      className="mt-0.5 size-9 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <p
                          id={`${uid}-addon-name`}
                          className="font-medium text-white"
                        >
                          {LACKSKYDD_TILLVAL.name}
                        </p>
                        <p className="font-semibold whitespace-nowrap text-white">
                          {formatKr(LACKSKYDD_TILLVAL.price)}
                        </p>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                        {LACKSKYDD_TILLVAL.description}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-white/10 px-4 py-4">
                    {/* Neither radio starts checked — an answer is required and
                        enforced in onSubmit, not preselected. checked compares
                        against true/false explicitly since the state is null. */}
                    <div
                      role="radiogroup"
                      aria-labelledby={`${uid}-addon-h ${uid}-addon-name`}
                      aria-required="true"
                      className="grid grid-cols-2 gap-2"
                    >
                      <label className={pillClass}>
                        <input
                          type="radio"
                          name="tillval"
                          required
                          className="sr-only"
                          checked={tillval === true}
                          onChange={() => setTillval(true)}
                          disabled={submitting}
                        />
                        Ja, lägg till
                      </label>
                      <label className={pillClass}>
                        <input
                          type="radio"
                          name="tillval"
                          required
                          className="sr-only"
                          checked={tillval === false}
                          onChange={() => setTillval(false)}
                          disabled={submitting}
                        />
                        Nej tack
                      </label>
                    </div>
                  </div>

                  {/* The cart contents as a subtle receipt ABOVE the total, so
                      the visitor reads what they chose before the sum. Prices
                      are stacked (current on top, struck anchor under), and the
                      tillval row joins ONLY on an explicit JA. The thumbnails
                      are decorative (alt=""). */}
                  <ul className="space-y-2.5 border-t border-white/10 px-4 py-3.5 text-xs">
                    <li className="flex items-start justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-white/70">
                        <img
                          src="/images/form/lackering.webp"
                          alt=""
                          loading="lazy"
                          decoding="async"
                          width={256}
                          height={256}
                          className="size-5 shrink-0 rounded object-cover"
                        />
                        {LACKERING.name}
                      </span>
                      <span className="shrink-0 text-right text-white/70">
                        <span className="block font-medium text-primary">
                          {formatKr(LACKERING.price)}
                        </span>
                        {/* The strike is visual-only CSS, so a screen reader
                            would otherwise hear two prices in a row with only
                            the abbreviation "ord." to separate them — spelled
                            out for SR. */}
                        <span className="block text-white/55 line-through">
                          <span aria-hidden="true">
                            ord. {formatKr(LACKERING.originalPrice)}
                          </span>
                          <span className="sr-only">
                            ordinarie pris {formatSek(LACKERING.originalPrice)} kr
                          </span>
                        </span>
                      </span>
                    </li>
                    {/* Samma villkor som gåvraden i steg 1: ingen rad utan en
                        riktig gåva. Till skillnad från tillvalsraden nedan
                        behöver den här inte reservera sin höjd — den kan inte
                        dyka upp mitt i ett ifyllande, den finns eller finns
                        inte för hela sidan. */}
                    {LACKERING_BONUS && (
                      <li className="flex items-start justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2 text-white/70">
                          {LACKERING_BONUS.name}
                        </span>
                        <span className="shrink-0 text-right text-white/70">
                          <span className="block font-medium text-primary">
                            0 kr
                          </span>
                          <span className="block text-white/55 line-through">
                            värde {formatKr(LACKERING_BONUS.value)}
                          </span>
                        </span>
                      </li>
                    )}
                    {/* Poleringsraden renderas ALLTID — den är bara osynlig
                        tills man svarat JA. Renderades den villkorligt växte
                        listan (och hela dialogen) i höjd i samma ögonblick man
                        klickade, vilket flyttar totalen och knappen under
                        fingret. `invisible` är visibility:hidden: raden
                        behåller exakt sitt utrymme men syns inte och tas
                        samtidigt ur tillgänglighetsträdet, så en skärmläsare
                        läser inte upp ett tillval som inte är valt. */}
                    <li
                      className={`flex items-start justify-between gap-3${
                        tillval === true ? "" : " invisible"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2 text-white/70">
                        <img
                          src="/images/form/keramiskt-lackskydd.webp"
                          alt=""
                          loading="lazy"
                          decoding="async"
                          width={256}
                          height={256}
                          className="size-5 shrink-0 rounded object-cover"
                        />
                        {LACKSKYDD_TILLVAL.name}
                      </span>
                      <span className="shrink-0 text-right font-medium text-primary">
                        {formatKr(LACKSKYDD_TILLVAL.price)}
                      </span>
                    </li>
                  </ul>

                  <div className="flex items-baseline justify-between gap-4 border-t border-white/10 bg-white/[0.03] px-4 py-4">
                    {/* aria-hidden on the visible label + sr-only "Totalt"
                        INSIDE the live region: with aria-atomic the
                        announcement is the whole phrase "Totalt X kr", never a
                        bare number — and the label is not read twice.
                        Prisorden ("från") är borttagna i hela steg 2 på
                        klientens begäran; friskrivningen direkt under totalen
                        bär frånpris-informationen för hela varukorgen. */}
                    <p aria-hidden="true" className="text-sm font-medium text-white">
                      Totalt
                    </p>
                    <p
                      aria-live="polite"
                      aria-atomic="true"
                      className="font-display text-2xl font-bold tracking-tight text-white"
                    >
                      <span className="sr-only">Totalt </span>
                      {/* key={cartValue} remontera elementet varje gång summan
                          ändras, vilket startar om .total-enter från första
                          bildrutan (se global.css). En CSS-transition duger
                          inte — det finns ingenting att interpolera mellan två
                          olika texter. inline-block: transform biter inte på
                          en inline-box. */}
                      <span
                        key={cartValue}
                        className="total-enter inline-block text-primary"
                      >
                        {formatKr(cartValue)}
                      </span>
                    </p>
                  </div>

                  <p className="text-muted-foreground border-t border-white/10 px-4 py-3 text-xs leading-relaxed">
                    Frånpris per detalj — en större yta som en huv eller ett
                    tak kostar mer. Du får exakt pris innan du bokar, utan
                    bindning.
                  </p>
                </div>

                <label className="mt-5 flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    name="consent"
                    required
                    className="accent-primary mt-0.5 size-4 shrink-0 cursor-pointer rounded"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    disabled={submitting}
                  />
                  <span className="text-xs leading-relaxed text-white/60">
                    {consentBefore}
                    <a
                      href="/integritet"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/80 underline underline-offset-2"
                    >
                      integritetspolicyn
                    </a>
                    {consentAfter} <span className="text-primary">*</span>
                  </span>
                </label>

                {TURNSTILE_SITE_KEY && (
                  <div className="mt-4">
                    <Turnstile
                      ref={turnstileRef}
                      siteKey={TURNSTILE_SITE_KEY}
                      onSuccess={setToken}
                      onExpire={() => setToken("")}
                      onError={() => setToken("")}
                      options={{ theme: "dark", language: "sv" }}
                    />
                  </div>
                )}

                {status === "error" && errorMsg && (
                  <p
                    key={attempt}
                    role="alert"
                    className="text-destructive mt-4 text-sm font-medium"
                  >
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 mt-5 flex w-full flex-col items-center justify-center rounded-full px-6 py-3.5 transition-colors disabled:opacity-60"
                >
                  <span className="text-lg leading-tight font-black tracking-wide uppercase">
                    {submitting ? "Skickar …" : "Hämta erbjudandet"}
                  </span>
                  {!submitting && (
                    <span className="mt-1.5 text-[11px] leading-tight font-bold tracking-wider opacity-80">
                      {`${discountLabel(LACKERING)} rabatt`.toUpperCase()}
                    </span>
                  )}
                </button>

                <p className="mt-3 text-center text-xs font-medium text-white/70">
                  🔒 Dina uppgifter är 100&nbsp;% säkrade
                </p>
                <p className="text-muted-foreground mt-2 text-center text-xs leading-relaxed">
                  Efter din förfrågan ringer vi upp dig inom 24 timmar och går
                  igenom exakt vad som ingår — du bestämmer sedan.
                </p>
              </>
            )}
          </form>
        )}
      </div>
    </dialog>
  );
};

// POST /api/lead — receives the landing page form, upserts the lead as a
// GoHighLevel contact, tags it (the starting gun for the follow-up workflow:
// SMS + e-mail to Hyper, auto-SMS to the lead), and sends a notification
// e-mail via Resend. If GHL is ever down the lead lands in the inbox instead
// of vanishing, and the visitor still sees a success screen.
//
// CONTRACT WITH THE GHL SIDE — do NOT rename without changing both ends:
//   payload keys   first_name, last_name, phone, email, reg_nr, paket,
//                  tillval, consent, consent_text_version, submitted_at,
//                  page_url, source — paket ("lackering") and tillval (boolean)
//                  come from the cart the form renders
//   also accepted   car_model, message, sms_marketing_consent — the form
//                  stopped collecting these, but the endpoint still reads
//                  them and writes each one ONLY when present, so they can be
//                  reinstated client-side without a server change
//   custom fields  reg_nr, paket, tillval, car_model, lead_message, page_url, submitted_at,
//                  contact_consent, contact_consent_timestamp,
//                  consent_text_version, sms_marketing_consent,
//                  sms_marketing_timestamp, utm_source, utm_campaign,
//                  utm_content
//   tag            hyper-lackering-lead (override with GHL_LEAD_TAG)
//
// ⚠️ EGEN GHL-LOCATION. Den här sidan får INTE posta till Mönsterås
// sub-account: GHL_LOCATION_ID och GHL_PIT måste vara Hyper Detailings egna,
// annars hamnar Hypers leads i en annan kunds CRM. Taggen är också egen, så
// lackeringsleads går att skilja från Hypers övriga trafik.
//
// Before flipping this on in production, create the custom fields listed above
// in the GHL sub-account. Posting a customField whose key does not exist can
// fail the whole upsert — which costs a real, paid-for lead.
//
// Secrets come from the Vercel env: GHL_PIT, GHL_LOCATION_ID,
// TURNSTILE_SECRET_KEY, RESEND_API_KEY. See .env.example.

import type { APIRoute } from "astro";

import { BUSINESS } from "@/data/business";
import { PAKET, LACKSKYDD_TILLVAL } from "@/data/packages";
import { formatSek } from "@/lib/utils";

// Run as a serverless function; every other route stays static.
export const prerender = false;

import { createHash } from "node:crypto";

import { META_PIXEL_ID } from "@/data/site";

const GHL = "https://services.leadconnectorhq.com";

/**
 * Vite/Astro exposes env vars whose value is exactly "true"/"false" as real
 * BOOLEANS on import.meta.env, so calling a string method on the raw result
 * throws. Always read env through here.
 */
const env = (name: string): string => {
  const raw =
    (import.meta.env as Record<string, unknown>)[name] ??
    process.env[name] ??
    "";
  return typeof raw === "string" ? raw : String(raw);
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const ghlHeaders = () => ({
  Authorization: `Bearer ${env("GHL_PIT")}`,
  Version: "2021-07-28",
  "Content-Type": "application/json",
});

/**
 * fetch with a hard timeout. Without one, a single upstream call that hangs
 * (GHL, Cloudflare, Resend) keeps the function alive until Vercel kills it — a
 * 500 that the try/catch below CANNOT intercept, because the process is gone.
 * With it, a hang rejects fast with an AbortError, which every caller here
 * already handles (GHL → e-mail failsafe, Turnstile → fail open, notify →
 * logged and ignored).
 */
const fetchT = (
  url: string,
  init: RequestInit = {},
  ms = 6000,
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
};

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const bool = (v: unknown) => v === true || v === "true";
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const escapeHtml = (v: string) =>
  v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * "070-123 45 67" → "+46701234567". Swedish-only by design: this page runs on
 * Swedish traffic for a workshop in Umeå, so a bare leading zero is
 * always a Swedish trunk prefix.
 */
const normalizePhone = (raw: string): string | undefined => {
  if (!raw) return undefined;
  const p = raw.replace(/[\s\-().]/g, "");
  if (!p) return undefined;
  if (p.startsWith("+")) return p;
  if (p.startsWith("00")) return `+${p.slice(2)}`;
  if (p.startsWith("0")) return `+46${p.slice(1)}`;
  if (p.startsWith("46")) return `+${p}`;
  return `+46${p}`;
};

/**
 * Human-readable package name for the notification e-mail and the GHL field.
 * Returns "" for an absent value — the form no longer asks which package the
 * visitor wants, and callers use the empty string to skip the field entirely
 * rather than write a blank over whatever GHL already had.
 */
const paketLabel = (id: string): string => {
  if (!id) return "";
  if (id === "vet-inte") return "Vet inte — vill ha hjälp att välja";
  return PAKET.find((p) => p.id === id)?.name ?? id;
};

const notify = async (subject: string, html: string): Promise<void> => {
  const key = env("RESEND_API_KEY");
  if (!key) {
    // Visible in the Vercel function logs — the only trace left when the
    // notification path is misconfigured.
    console.error("[lead] notify skipped: RESEND_API_KEY is not set");
    return;
  }
  const from =
    env("LEAD_FROM_EMAIL") ||
    "Hyper Detailing <noreply@updates.marksenmedia.se>";
  const to = (
    env("LEAD_TO_EMAIL") || `${BUSINESS.email}, william@marksendigital.se`
  )
    .split(",")
    .map((addr) => addr.trim())
    .filter(Boolean);

  try {
    const res = await fetchT("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok)
      console.error(`[lead] Resend ${res.status}: ${await res.text()}`);
  } catch (err) {
    // A notification failure must never block the lead.
    console.error(
      `[lead] Resend request failed: ${err instanceof Error ? err.message : err}`,
    );
  }
};

/**
 * Cloudflare Turnstile. Missing/invalid token → rejected. If the secret is not
 * configured (local dev) the check is skipped, and a Cloudflare outage FAILS
 * OPEN — a paid-for lead must never be lost to a verification hiccup. The
 * honeypot still applies in both cases.
 */
/* --------------------------------------------------------------------------
   Meta Conversions API.

   The browser pixel fires "Lead" with an eventID; this sends the SAME event,
   same id, from the server — Meta deduplicates the pair, and the server copy
   survives ad blockers, iOS tracking prevention and closed tabs. Enabled only
   when META_CAPI_ACCESS_TOKEN and PUBLIC_META_PIXEL_ID are both set; it can
   never fail the lead (own try/catch, logged and dropped).

   PII is SHA-256-hashed after Meta's normalisation rules (lowercase/trim,
   phone as digits-only E.164). fbp/fbc come from the pixel's own cookies via
   the form; when the _fbc cookie is missing but the visit carried an fbclid,
   fbc is reconstructed per Meta's documented format.
-------------------------------------------------------------------------- */

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

const capiLead = async (args: {
  eventId: string;
  pageUrl: string;
  email?: string;
  phoneE164?: string;
  firstName?: string;
  lastName?: string;
  ip?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  fbclid?: string;
  value?: number;
}): Promise<void> => {
  const pixelId = META_PIXEL_ID;
  const token = env("META_CAPI_ACCESS_TOKEN");
  if (!pixelId || !token) return;

  const fbc =
    args.fbc || (args.fbclid ? `fb.1.${Date.now()}.${args.fbclid}` : undefined);

  const userData: Record<string, unknown> = {
    ...(args.email ? { em: [sha256(args.email.trim().toLowerCase())] } : {}),
    ...(args.phoneE164
      ? { ph: [sha256(args.phoneE164.replace(/\D/g, ""))] }
      : {}),
    ...(args.firstName
      ? { fn: [sha256(args.firstName.trim().toLowerCase())] }
      : {}),
    ...(args.lastName
      ? { ln: [sha256(args.lastName.trim().toLowerCase())] }
      : {}),
    ...(args.ip ? { client_ip_address: args.ip } : {}),
    ...(args.userAgent ? { client_user_agent: args.userAgent } : {}),
    ...(args.fbp ? { fbp: args.fbp } : {}),
    ...(fbc ? { fbc } : {}),
  };

  const payload = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: args.eventId,
        action_source: "website",
        ...(args.pageUrl ? { event_source_url: args.pageUrl } : {}),
        user_data: userData,
        custom_data: {
          content_name: "hyper-lackering-lp",
          ...(args.value ? { value: args.value, currency: "SEK" } : {}),
        },
      },
    ],
  };

  try {
    const res = await fetchT(
      `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) {
      console.error(`[lead] Meta CAPI ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error(
      `[lead] Meta CAPI failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
};

const verifyTurnstile = async (
  token: string,
  ip?: string,
): Promise<boolean> => {
  const secret = env("TURNSTILE_SECRET_KEY");
  if (!secret) return true;
  if (!token) return false;
  try {
    const res = await fetchT(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          response: token,
          ...(ip ? { remoteip: ip } : {}),
        }),
      },
      5000,
    );
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return true; // fail open
  }
};

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  // Honeypot: bots fill the hidden field, humans never see it. Fake success.
  if (str(body.website_hp)) return json({ ok: true });

  const firstName = str(body.first_name);
  const lastName = str(body.last_name);
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const rawPhone = str(body.phone);
  const email = str(body.email).toLowerCase();
  const paket = str(body.paket);
  // The cart upsell. hasTillval separates "answered NEJ" from an old cached
  // client that never rendered the question — the two must read differently
  // in the notification e-mail.
  const hasTillval = "tillval" in body;
  const tillvalYes = bool(body.tillval);
  const carModel = str(body.car_model);
  // Uppercased and whitespace-collapsed so "abc123", "ABC 123" and "abc  123"
  // all store identically in GHL. Required ON THE FORM since 2026-08-14 — but
  // deliberately NOT a 400 here: a visitor on a page cached from before the
  // field existed posts without it, and rejecting that submission costs a
  // real, paid-for lead over a field the shop can ask for on the phone.
  const regNr = str(body.reg_nr).toUpperCase().replace(/\s+/g, " ");
  const message = str(body.message);
  const consent = bool(body.consent);
  const smsMarketing = bool(body.sms_marketing_consent);
  // Whether the submission carried the marketing field at all, as opposed to
  // carrying it set to false. The form stopped asking, so the two cases mean
  // very different things in the notification e-mail.
  const hasMarketingField = "sms_marketing_consent" in body;
  const consentVersion = str(body.consent_text_version);
  const submittedAt = str(body.submitted_at) || new Date().toISOString();
  const pageUrl = str(body.page_url);

  // Every field on the form is required, and the client checks each one before
  // it ever posts — so a submission missing any of them is a bot or a broken
  // client, not a real visitor who mistyped.
  if (!firstName || !lastName || !rawPhone || !email) {
    return json({ ok: false, error: "missing_fields" }, 400);
  }
  // PRESENCE is required (above); FORMAT deliberately is not enforced with a
  // 400. The client already rejects a malformed address with a field-specific
  // message, so anything reaching here has bypassed it — and at that point
  // destroying the lead is the worse outcome. This return would come before
  // the try/catch, so even the Resend failsafe would not fire and the lead
  // would vanish with no trace anywhere. Instead we withhold the bad address
  // from GoHighLevel (which does reject a malformed one on upsert) and pass
  // the raw string through to the notification e-mail, so the shop can still
  // read it and call the person.
  const emailOk = isEmail(email);
  // Consent is a hard gate, re-checked server-side: the client can be bypassed,
  // and contacting someone who never ticked the box is the one failure mode
  // that costs more than a lost lead.
  if (!consent) {
    return json({ ok: false, error: "consent_required" }, 400);
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined;
  if (!(await verifyTurnstile(str(body.turnstile_token), ip))) {
    return json({ ok: false, error: "turnstile_failed" }, 400);
  }

  const phone = normalizePhone(rawPhone);
  const paketName = paketLabel(paket);
  const eventId = str(body.event_id);
  // What the visitor saw as the cart total — frånpris, for the e-mail only.
  const paketObj = PAKET.find((p) => p.id === paket);
  const cartValue = paketObj
    ? paketObj.price + (tillvalYes ? LACKSKYDD_TILLVAL.price : 0)
    : undefined;
  const utmSource = str(body.utm_source);
  const utmCampaign = str(body.utm_campaign);
  const utmContent = str(body.utm_content);
  // Meta's click id. Not written to GHL — no `fbclid` custom field exists in
  // the sub-account, and posting an unknown key can fail the whole upsert. It
  // is used only to label the notification e-mail, so an ad click whose UTM
  // parameters were never configured in Ads Manager does not read as "direct".
  const fbclid = str(body.fbclid);
  const sourceLabel = utmSource || (fbclid ? "facebook (fbclid)" : "direct");

  // Server-side Meta Lead event — a verified-human, consented lead regardless
  // of what GHL does next, so it fires before the sync rather than inside its
  // try/catch. Awaited (not fire-and-forget: the serverless runtime may kill
  // in-flight work after the response) but never able to fail the request.
  await capiLead({
    eventId,
    pageUrl,
    email: emailOk ? email : undefined,
    phoneE164: phone,
    firstName,
    lastName,
    ip,
    userAgent: request.headers.get("user-agent") ?? undefined,
    fbp: str(body.fbp) || undefined,
    fbc: str(body.fbc) || undefined,
    fbclid: fbclid || undefined,
    value: cartValue,
  });

  const contact = {
    locationId: env("GHL_LOCATION_ID"),
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    email: emailOk ? email : undefined,
    phone,
    source: "hyper-lackering-lp",
    customFields: [
      // paket is live again: the cart pre-loads Lackering, so every current
      // submission carries it. car_model / lead_message are no longer
      // collected, but the endpoint still accepts them so the fields can be
      // reinstated client-side without a server change. All are written ONLY when the
      // submission actually carries a value: GHL upserts dedupe on
      // phone/e-mail, so posting an empty string would wipe whatever a
      // returning customer's earlier enquiry had stored there. Same reasoning
      // as the consent and attribution blocks below.
      ...(regNr ? [{ key: "reg_nr", field_value: regNr }] : []),
      ...(paketName ? [{ key: "paket", field_value: paketName }] : []),
      // THIS submission's answer, as the literal strings the GHL workflow
      // templates print — {{contact.tillval}} renders "JA" or "NEJ". Written
      // on every submission that carried the question (hasTillval guards the
      // old-cached-page case, where the answer is unknown rather than NEJ).
      //
      // Deliberately NOT grant-only like the consent fields below: the
      // notification workflow reads the field the moment the tag lands, so it
      // must hold the CURRENT enquiry's answer — which means a returning
      // customer's NEJ overwrites their earlier JA. That is the accepted
      // trade-off; the notification e-mail archives every submission's answer,
      // so history survives outside GHL. Do not filter long-term segments on
      // this field — it only ever reflects the latest enquiry.
      ...(hasTillval
        ? [{ key: "tillval", field_value: tillvalYes ? "JA" : "NEJ" }]
        : []),
      ...(carModel ? [{ key: "car_model", field_value: carModel }] : []),
      ...(message ? [{ key: "lead_message", field_value: message }] : []),
      { key: "page_url", field_value: pageUrl },
      { key: "submitted_at", field_value: submittedAt },
      // The consent record. Stored as explicit 'true'/'false' strings so a GHL
      // workflow can filter on them, alongside the exact wording version the
      // contact agreed to — which is what makes the consent provable later.
      { key: "contact_consent", field_value: "true" },
      { key: "contact_consent_timestamp", field_value: submittedAt },
      { key: "consent_text_version", field_value: consentVersion },
      // Marketing consent is written ONLY on a grant. GHL upserts dedupe on
      // phone/e-mail, so writing 'false' here would let a later enquiry from a
      // returning customer silently revoke a marketing opt-in they gave
      // earlier — with no revocation event and no way to notice.
      ...(smsMarketing
        ? [
            { key: "sms_marketing_consent", field_value: "true" },
            { key: "sms_marketing_timestamp", field_value: submittedAt },
          ]
        : []),
      // Attribution rides along only when this submission actually carries it,
      // for the same reason: a later direct enquiry must not blank the campaign
      // that originally produced the contact.
      ...(utmSource || utmCampaign || utmContent
        ? [
            { key: "utm_source", field_value: utmSource || "direct" },
            { key: "utm_campaign", field_value: utmCampaign },
            { key: "utm_content", field_value: utmContent },
          ]
        : []),
    ],
  };

  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 14px 4px 0;color:#666;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:4px 0;color:#111">${escapeHtml(value)}</td></tr>`;

  const detailsHtml = `
    <div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;color:#111">
      <h2 style="margin:0 0 12px">Ny förfrågan – Hyper Detailing (lackering)</h2>
      <table style="border-collapse:collapse">
        ${row("Namn", fullName || firstName)}
        ${row("Telefon", phone || rawPhone)}
        ${row("Regnr", regNr || "(ej angivet)")}
        ${row("E-post", email ? (emailOk ? email : `${email} (ogiltig adress — inte skickad till GHL)`) : "(ej angivet)")}
        ${paketName ? row("Paket", paketName) : ""}
        ${
          hasTillval
            ? row(
                "Tillval",
                tillvalYes
                  ? `JA — ${LACKSKYDD_TILLVAL.name} (+ från ${formatSek(LACKSKYDD_TILLVAL.price)} kr)`
                  : "Nej",
              )
            : ""
        }
        ${cartValue ? row("Värde", `från ${formatSek(cartValue)} kr`) : ""}
        ${carModel ? row("Bilmodell", carModel) : ""}
        ${row("Samtycke kontakt", "JA")}
        ${
          // Only rendered when the form actually asked. It no longer does, and
          // a row reading "NEJ" on every lead would look like the customer
          // declined rather than was never offered the choice.
          hasMarketingField
            ? row("Samtycke marknadsföring", smsMarketing ? "JA" : "NEJ")
            : ""
        }
        ${row("Samtyckestext", consentVersion || "–")}
        ${row("Skickat", submittedAt)}
        ${row("Källa", `${sourceLabel} / ${utmCampaign || "–"} / ${utmContent || "–"}`)}
        ${row("Sida", pageUrl || "–")}
      </table>
      ${
        message
          ? `<p style="margin:16px 0 4px;color:#666">Meddelande:</p>
      <p style="margin:0;white-space:pre-wrap">${escapeHtml(message)}</p>`
          : ""
      }
    </div>`;

  try {
    // 1) Create or update the contact. GHL dedupes on e-mail/phone, so a repeat
    //    enquiry updates the same contact rather than creating a duplicate.
    const upsert = await fetchT(`${GHL}/contacts/upsert`, {
      method: "POST",
      headers: ghlHeaders(),
      body: JSON.stringify(contact),
    });
    if (!upsert.ok) {
      throw new Error(`GHL upsert ${upsert.status}: ${await upsert.text()}`);
    }
    const data = (await upsert.json()) as { contact?: { id?: string } };
    const contactId = data?.contact?.id;
    if (!contactId) throw new Error("GHL upsert returned no contact id");

    // 2) Tag it — this fires the "Contact Tag Added" workflow trigger, which is
    //    what actually sends the notification SMS/e-mail and the auto-SMS to
    //    the lead. Re-adding an existing tag is a no-op.
    const tag = env("GHL_LEAD_TAG") || "hyper-lackering-lead";
    const tagRes = await fetchT(`${GHL}/contacts/${contactId}/tags`, {
      method: "POST",
      headers: ghlHeaders(),
      body: JSON.stringify({ tags: [tag] }),
    });
    if (!tagRes.ok) {
      throw new Error(`GHL tag ${tagRes.status}: ${await tagRes.text()}`);
    }

    await notify(
      `Ny förfrågan: ${fullName || firstName} – ${paketName}${tillvalYes ? " + tillval" : ""}`,
      detailsHtml,
    );

    return json({ ok: true, lead_id: contactId });
  } catch (err) {
    // Failsafe: the lead lands in the inbox instead of vanishing, and the
    // visitor still sees the success screen. Losing a paid lead to an upstream
    // outage is strictly worse than a manual copy-paste into GHL.
    const messageStr = err instanceof Error ? err.message : String(err);
    console.error(`[lead] GHL sync failed: ${messageStr}`);
    await notify(
      "GHL-synk misslyckades – lägg in leadet manuellt",
      `${detailsHtml}<hr><p style="color:#b00">${escapeHtml(messageStr)}</p>`,
    );
    return json({ ok: true, degraded: true });
  }
};

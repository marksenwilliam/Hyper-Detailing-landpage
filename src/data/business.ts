/**
 * Canonical business identity (NAP) — single source of truth.
 *
 * Use these values everywhere (page copy, JSON-LD schema, footer, forms) so the
 * NAP stays byte-identical across the site and every external citation.
 *
 * KÄLLA: Hyper Detailings egen sajt (hyper-detailing.vercel.app och det lokala
 * projektet hyper_detailing_astro-main), där e-post och adress anges som
 * klientens riktiga uppgifter (SMS augusti 2026).
 *
 * ⚠️ TELEFONNUMRET ÄR EN PLATSHÅLLARE. 090-123 45 67 står som platshållare även
 * på huvudsajten och får INTE gå live på en annonssida — en Meta-annons som
 * skickar trafik till ett påhittat nummer bränner budget och riskerar kontot.
 * Byt till det riktiga numret innan första annonskronan spenderas. Se även
 * openingHours och orgnr nedan, som saknas helt.
 */
export const BUSINESS = {
  name: "Hyper Detailing",
  /** Fullständigt namn med ort — används i schema och sidfot. */
  fullName: "Hyper Detailing Umeå",
  /**
   * ⚠️ SAKNAS — organisationsnumret finns inte i klientens material. Lämnas
   * tomt; JSON-LD hoppar över fältet hellre än att gissa.
   */
  orgnr: "",
  /**
   * ⚠️ VERIFIERA — vercel-adressen är den enda kända publika URL:en. Pekas en
   * riktig domän hit ska den in här OCH i astro.config.mjs `site`, som ska
   * hållas identisk med detta värde.
   */
  url: "https://hyper-detailing.vercel.app",
  email: "hyperdetailingumea@gmail.com",
  /** ⚠️ SAKNAS — kontaktpersonens namn finns inte i materialet. */
  contactPerson: "",
  /**
   * SKYDDSSPÄRR: så länge den här är true behandlas numret nedan som påhittat
   * och renderas INTE någonstans på sidan — kontaktsektionen hoppar över
   * telefonraden och JSON-LD utelämnar `telephone`.
   *
   * Ett påhittat nummer på en annonsdestination är värre än inget nummer alls:
   * besökaren ringer, kommer fel, och klicket är betalt och förlorat. Sätt den
   * till false i samma commit som du fyller i det riktiga numret — inte innan.
   */
  phoneIsPlaceholder: true,
  phone: {
    /** Human-readable, used in visible copy. ⚠️ PLATSHÅLLARE. */
    display: "090-123 45 67",
    /** href value for click-to-call links. ⚠️ PLATSHÅLLARE. */
    href: "tel:+46901234567",
    /** E.164, used in schema `telephone` and in sms:/WhatsApp links. ⚠️ PLATSHÅLLARE. */
    e164: "+46901234567",
  },
  address: {
    street: "Industrivägen 22",
    postalCode: "901 30",
    locality: "Umeå",
    region: "Västerbottens län",
    country: "SE",
  },
  /**
   * ⚠️ SAKNAS — ingen Google Maps-länk finns i klientens material. Tom sträng
   * gör att kartan faller tillbaka på en sökning efter namn + adress.
   */
  maps: "",
  /**
   * ⚠️ PLATSHÅLLARE — huvudsajten listar mån–fre 08–17 och lör 10–14, men
   * kommentaren där säger uttryckligen att tiderna är obekräftade (klienten sa
   * "09-19" utan att ange vilka dagar). Sätt en riktig sträng när Hyper
   * bekräftat, så visas den automatiskt i toppraden och i kontaktsektionen.
   * null = raden döljs, vilket är rätt läge tills dess.
   */
  openingHours: null as string | null,
  /**
   * Areas served — används för LocalBusiness `areaServed` och för
   * "Umeå med omnejd"-copyn. Orterna ligger inom rimligt pendlingsavstånd från
   * Industrivägen; ta bort dem Hyper inte faktiskt tar emot bilar från.
   */
  areaServed: [
    "Umeå",
    "Holmsund",
    "Obbola",
    "Sävar",
    "Vännäs",
    "Robertsfors",
    "Nordmaling",
    "Vindeln",
  ],
  social: {
    /** ⚠️ SAKNAS — huvudsajtens sociala länkar pekar alla på "#". */
    facebook: "",
    instagram: "",
  },
} as const;

/** "Industrivägen 22, 901 30 Umeå" */
export const ADDRESS_ONELINE = `${BUSINESS.address.street}, ${BUSINESS.address.postalCode} ${BUSINESS.address.locality}`;

/** "Hyper Detailing · Industrivägen 22, 901 30 Umeå · 090-123 45 67" */
export const NAP_ONELINE = `${BUSINESS.name} · ${ADDRESS_ONELINE} · ${BUSINESS.phone.display}`;

/** wa.me deep link built from the canonical E.164 number. */
export const WHATSAPP_HREF = `https://wa.me/${BUSINESS.phone.e164.replace("+", "")}`;

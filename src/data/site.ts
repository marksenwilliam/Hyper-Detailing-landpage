import { BUSINESS } from "@/data/business";
import { LACKERING } from "@/data/packages";
import { formatKr } from "@/lib/utils";

/**
 * "Lackering", aldrig "lackrenovering" eller "bättring": erbjudandet är
 * sprutlackering av en hel karossdel (bekräftat av kunden 2026-08-31), och de
 * två andra orden läser som något mindre omfattande.
 *
 * Titeln bär samma rabattpåstående som H1:et och formulärets rubrik — alla tre
 * läser discountLabel(LACKERING), som resolvar till "50 %". Ändras priserna i
 * packages.ts ändras siffran automatiskt överallt, men den här strängens
 * ORDALYDELSE är handskriven: läs om den om erbjudandet ändras.
 *
 * Enheten "per detalj" står med redan i titeln. Utan den läser 1 500 kr som ett
 * pris för hela bilen, och då blir klicket besviket i samma sekund det landar
 * (claim rule 1 i packages.ts).
 */
export const SITE_TITLE = `Halva priset på lackering i Umeå: från ${formatKr(LACKERING.price)} per detalj | ${BUSINESS.name}`;

/** Hur snabbt klienten lovat svara. Används på flera ställen. */
export const RESPONSE_TIME = "inom 24 timmar";

// Hålls under 160 tecken — Google klipper längre beskrivningar mitt i meningen.
export const SITE_DESCRIPTION = `Sprutlackering av dörr, skärm, stötfångare eller huv i Umeå. Just nu från ${formatKr(LACKERING.price)} per detalj — ordinarie från ${formatKr(LACKERING.originalPrice)}. Svar ${RESPONSE_TIME}.`;

/**
 * Knapphetsrad. Ett hårt datum på en evergreen-annonssida blir inaktuellt i
 * samma stund kampanjen rullar förbi det, så den här är kapacitetsbaserad.
 *
 * ⚠️ HÅLL DEN SANN. Begränsar Hyper inte antalet lackeringar per vecka på
 * riktigt — ta bort raden. Ett påhittat knapphetspåstående är både sämre
 * marknadsföring och en risk mot annonskontot.
 */
export const SCARCITY = "Begränsat antal lackeringstider varje vecka";

/**
 * Meta Pixel id — publikt till sin natur, så det bor här med resten av
 * sajtdatat. PUBLIC_META_PIXEL_ID i env:en överrider fortfarande (bra för en
 * staging-pixel). Tomt i dev så `astro dev` på localhost aldrig skickar
 * PageViews till den riktiga datamängden.
 *
 * ⚠️ SAKNAS — Hyper Detailing har ingen känd pixel. Mönsterås pixel-id fick
 * INTE följa med hit; den hade skickat Hypers annonsdata till en annan kunds
 * dataset. Fyll i Hypers eget id nedan, eller sätt PUBLIC_META_PIXEL_ID i env.
 *
 * CAPI-ACCESSTOKEN är motsatt sorts värde: en riktig hemlighet, läses bara
 * server-side ur META_CAPI_ACCESS_TOKEN. Den får aldrig stå här.
 */
export const META_PIXEL_ID: string =
  import.meta.env.PUBLIC_META_PIXEL_ID || "";

/**
 * Version på samtyckestexten. Bumpa strängen när formuleringen i
 * samtyckesrutan ändras — den sparas med varje lead i GoHighLevel, så du alltid
 * kan bevisa exakt vilken text en given kontakt godkände.
 */
export const CONSENT_COPY_VERSION = "hyper-lackering-lp-2026-08-31";

export const CONSENT_TEXT =
  "Jag godkänner att " +
  BUSINESS.name +
  " kontaktar mig via telefon, SMS och e-post om min förfrågan, och att mina uppgifter behandlas enligt integritetspolicyn.";

export const SITE_METADATA = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  siteName: BUSINESS.name,
  /** Sätt till en sökväg under /public när OG-bilden finns (1200 × 630). */
  ogImage: "",
  locale: "sv_SE",
};

import { IMAGES, type ImageSlot } from "@/data/images";
import { formatKr, formatSek } from "@/lib/utils";

/**
 * Erbjudandet — EN tjänst, inget paketutbud.
 *
 * Den här landningssidan säljer bara lackering. Hyper Detailings övriga
 * tjänster (rekond, keramiskt lackskydd som helhet, invändig städning) finns
 * på huvudsajten och ska INTE tillbaka hit: en annonssida med flera
 * erbjudanden konverterar sämre än en med ett.
 *
 * PRISKÄLLA: kunden (William, Marksen Digital) 2026-08-31 — ordinarie 3 000 kr
 * per detalj, kampanjpris 1 500 kr per detalj, och 1 500 är ett FRÅNPRIS:
 * "en huv blir exempelvis dyrare".
 *
 * CLAIM-REGLER — bryt dem inte:
 *
 *  1. ALLA PRISER ÄR FRÅNPRISER, PER DETALJ. Priset beror på vilken detalj det
 *     gäller, hur stor den är och hur skadan ser ut. Varje plats som visar en
 *     siffra måste visa både "från" och "per detalj" — aldrig en naken prislapp.
 *  2. ⚠️ ORDINARIEPRISET ÄR OMTVISTAT. Hypers publika sajt
 *     (hyper-detailing.vercel.app) listar lackering till 2 000 kr per detalj.
 *     Kunden har uttryckligen valt 3 000 kr som ordinariepris för kampanjen.
 *     Ett ankarpris som inte stämmer med företagets egen prislista är en
 *     marknadsföringsrisk — stäm av med Hyper innan sidan kör trafik, och
 *     ändra inte siffran här utan att ändra den på huvudsajten samtidigt.
 *  3. INGEN HÅLLBARHET I ÅR ELLER MÅNADER för själva lackeringen, och inga
 *     garantiord ("livstidsgaranti", "garanterat hållbart") — det finns inget
 *     underlag för dem i klientens material.
 *  4. Endast det keramiska lackskyddet (tillvalet) får ange 8 års hållbarhet,
 *     och bara så som Hypers egen prislista formulerar det.
 *  5. Använd inte ordet "certifierad" — ingen certifiering är verifierad.
 *  6. Svenskt talformat rakt igenom: "1 500 kr", aldrig "1.500:-".
 *  7. Skriv aldrig ut vad som INTE ingår som en gissning. `excludes` är tom
 *     tills Hyper sagt exakt var gränsen går mot plåtarbete och riktning.
 */

export type Paket = {
  /** Stable id — used as the <option value> the lead form posts to GHL. */
  id: string;
  name: string;
  /** Short line under the name. */
  tagline: string;
  /** The two or three bullets shown on the card face. */
  highlights: string[];
  /** Everything included, shown in the "Detta ingår" list. */
  includes: string[];
  /**
   * Explicitly NOT included — renderas med rött kryss där `includes` renderas.
   * Tom tills klienten bekräftat gränsdragningen (claim rule 7).
   */
  excludes?: { name: string; description?: string }[];
  /** Bonus thrown in with this package, if any. */
  bonus?: string;
  price: number;
  originalPrice: number;
  /**
   * Prisenhet, t.ex. "per detalj". Renderas direkt efter varje pris, så en
   * siffra aldrig kan läsas som ett pris för hela bilen.
   */
  unit: string;
  image: ImageSlot;
};

const paket = (p: Paket) => p;

/**
 * ⚠️ INGEN BONUS / INGET "PÅ KÖPET".
 *
 * Mallen (Mönsterås Bilvård) hade en gratis motortvätt + underspolning värd
 * 800 kr som red med i erbjudandet. Hyper har inte erbjudit någon motsvarande
 * gåva, och en påhittad gåva är ett påhittat värde. Konstanten är därför null,
 * och varje komponent som visade gåvraden döljer den i stället.
 *
 * Vill Hyper lägga till en verklig gåva: fyll i name + value här, så dyker
 * raden upp igen i hero, erbjudandesektionen, innehållslistan och formuläret.
 */
export const LACKERING_BONUS: { name: string; value: number } | null = null;

/**
 * Frånpris för tillvalet, utöver lackeringspriset. Ligger här uppe, före
 * LACKERING, eftersom paketets rader citerar det.
 *
 * 4 995 kr är Hypers EGET listpris för keramiskt lackskydd (deras prislista
 * via SMS augusti 2026, publicerad på huvudsajten). Det är alltså inget
 * kampanjpris och rabatteras inte här.
 */
export const LACKSKYDD_PRICE = 4995;

export const LACKERING = paket({
  id: "lackering",
  name: "Lackering",
  tagline:
    "Sprutlackering av enskild karossdel — dörr, skärm, stötfångare eller huv.",
  highlights: [
    "Sprutlackering av en hel karossdel i taget",
    "Färgen matchas mot bilens befintliga kulör",
    "Fast frånpris per detalj — du får beskedet innan du bokar",
  ],
  /**
   * ⚠️ STEGEN NEDAN ÄR INTE BEKRÄFTADE AV HYPER.
   *
   * De beskriver de moment en sprutlackering av en karossdel per definition
   * innehåller — en detalj kan inte lackeras utan att först maskeras eller
   * demonteras, slipas, grundas, färglackeras och klarlackeras. Inget av dem
   * är ett extra löfte utöver tjänsten kunden köper.
   *
   * Men ordval, ordning och omfattning ska ändå läsas igenom med Hyper innan
   * sidan kör betald trafik. Särskilt: används grundfärg alltid, ingår
   * demontering eller bara maskering, och lackeras det i box?
   */
  includes: [
    "Genomgång av skadan och färgkod",
    "Demontering eller maskering av detaljen",
    "Slipning och förbehandling av ytan",
    "Grundlackering",
    "Färglackering i bilens kulör",
    "Klarlack",
    "Montering och avsyning",
  ],
  // Tom med flit (claim rule 7). Fyll på när Hyper sagt var gränsen går mot
  // plåtarbete, riktning och rostlagning.
  excludes: [],
  price: 1500,
  originalPrice: 3000,
  unit: "per detalj",
  image: IMAGES.sprutlackering,
});

/** Sidans enda erbjudande. Listan finns kvar för formulärets <select>. */
export const PAKET = [LACKERING] as const;

/* -------------------------------------------------------------------------- */
/* Derived numbers — computed, never hand-written, so a price edit above can    */
/* not leave a stale "spara X kr" or "Y % rabatt" behind.                       */
/* -------------------------------------------------------------------------- */

export const savings = (p: Paket) => p.originalPrice - p.price;

/** Rounded to a whole percent. 1 500 från 3 000 → 50. */
export const discountPercent = (p: Paket) =>
  Math.round((savings(p) / p.originalPrice) * 100);

/** "Spara 1 500 kr" */
export const savingsLabel = (p: Paket) => `Spara ${formatKr(savings(p))}`;

/**
 * Rabatten som sidan skriver den.
 *
 * Mallens variant sa "Mer än 50 %" och räknade fram närmaste femtal UNDER den
 * verkliga rabatten — en formulering byggd för 54 %, som med exakt 50 % hade
 * blivit "Mer än 45 %" och därmed sålt in erbjudandet sämre än det är.
 *
 * Här är rabatten exakt 50 %, så siffran skrivs ut rakt av. Den räknas
 * fortfarande fram ur priserna, så en prisändring kan aldrig lämna en gammal
 * procentsats kvar. Blir rabatten ojämn efter en prisändring avrundas den —
 * kontrollera då att avrundningen inte råkar runda UPP, vilket vore ett
 * överdrivet påstående.
 */
export const discountLabel = (p: Paket) => `${discountPercent(p)} %`;

/** True när rabatten är exakt halva priset — då duger "halva priset" som hook. */
export const isHalfPrice = (p: Paket) => p.price * 2 === p.originalPrice;

/** "från 1 500 kr" */
export const fromPrice = (p: Paket) => `från ${formatKr(p.price)}`;

/** "från 1 500 kr per detalj" — claim rule 1: enheten följer alltid med. */
export const fromPriceWithUnit = (p: Paket) => `${fromPrice(p)} ${p.unit}`;

/** "ord. från 3 000 kr" */
export const originalLabel = (p: Paket) =>
  `ord. från ${formatSek(p.originalPrice)} kr`;

/** Options for the lead form's package <select>, in catalogue order. */
export const paketOptions = PAKET.map((p) => ({
  value: p.id,
  label: `${p.name} — ${fromPriceWithUnit(p)}`,
}));

/* -------------------------------------------------------------------------- */
/* Stegen, itemiserade.                                                         */
/*                                                                              */
/* `includes` ovan är enda källan till VAD som ingår — noterna här berikar bara. */
/* Ett steg som läggs till ovan utan not renderas som en giltig enradig post,    */
/* och en not vars nyckel inte längre matchar ett steg läses aldrig.             */
/*                                                                              */
/* ⚠️ Samma förbehåll som för `includes`: skriven för sidan, inte hämtad ur      */
/* klientens material. Läs igenom med Hyper före lansering.                      */
/* -------------------------------------------------------------------------- */

const STEP_NOTES: Record<string, string> = {
  "Genomgång av skadan och färgkod":
    "Vi tittar på detaljen, läser av bilens färgkod och sätter priset innan något görs.",
  "Demontering eller maskering av detaljen":
    "Detaljen tas loss eller maskeras av så att lacken inte hamnar där den inte ska.",
  "Slipning och förbehandling av ytan":
    "Ytan slipas ner och rengörs så att den nya lacken får fäste.",
  Grundlackering: "Grunden läggs på och ger färgen ett jämnt underlag.",
  "Färglackering i bilens kulör":
    "Kulören blandas efter bilens färgkod och sprutas på i flera lager.",
  Klarlack: "Klarlacken ger djupet och glansen — och skyddar färgen under.",
  "Montering och avsyning":
    "Detaljen monteras tillbaka och gås igenom innan du hämtar bilen.",
};

export type PaketFeature = {
  name: string;
  /** undefined = no note; the row renders as a single line. */
  description?: string;
};

/** Ett pakets includes parade med sina noter, i katalogordning. */
export const featuresOf = (p: Paket): PaketFeature[] =>
  p.includes.map((name) => ({ name, description: STEP_NOTES[name] }));

/* -------------------------------------------------------------------------- */
/* Tillvalet — det ENDA merförsäljningssteget formuläret erbjuder.              */
/*                                                                              */
/* Keramiskt lackskydd på den nylackerade ytan. Priset och 8-årslöftet är       */
/* Hypers egna, ordagrant från deras prislista (claim rule 4) — hitta inte på   */
/* ett kampanjpris här, tillvalet ingår inte i kampanjen.                       */
/* -------------------------------------------------------------------------- */

export const LACKSKYDD_TILLVAL = {
  id: "keramiskt-lackskydd",
  name: "Keramiskt lackskydd",
  description:
    "Skyddar den nylackerade ytan — 8 års hållbarhet enligt vår ordinarie prislista",
  /** Ordinarie listpris, utöver lackeringspriset. */
  price: LACKSKYDD_PRICE,
} as const;

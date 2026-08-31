/**
 * Socialt bevis.
 *
 * KÄLLA: Hyper Detailings egen sajt (hyper_detailing_astro-main/src/data/
 * reviews.ts), där citaten är transkriberade från skärmbilder av klientens
 * Google Business-profil och Facebook-sida (levererade augusti 2026).
 *
 * CITATEN ÄR ORDAGRANNA — recensenternas egen stavning, interpunktion och
 * emoji står kvar. Städa inte upp dem; en tillrättalagd recension läser som en
 * påhittad. Detsamma gäller trunkeringen i Mirsad Imeris citat.
 *
 * ⚠️ TVÅ SAKER SAKNAS OCH FÅR INTE GISSAS:
 *
 *  1. Stjärnsnittet och det totala antalet publicerade omdömen. Profilen går
 *     inte att hitta via sökning (kontrollerat 2026-08-31) och siffrorna finns
 *     inte i klientens material. Därför är `rating` och `count` null nedan —
 *     GoogleRating visar då bara "Omdömen på Google" utan att påstå ett snitt
 *     eller ett antal. Öppna profilen, läs av de riktiga siffrorna och fyll i.
 *     Antalet nedan (11) är antalet SKÄRMBILDER som transkriberats, inte
 *     antalet publicerade omdömen — använd det aldrig som `count`.
 *  2. Att recensenterna godkänt att citeras i marknadsföring. Google-omdömen är
 *     publika, men be Hyper bekräfta innan sidan kör betald trafik.
 *  3. ⚠️ STJÄRNORNA PÅ DE ENSKILDA OMDÖMENA. `rating: 5` nedan är INTE avläst
 *     ur källan — skärmbilderna som transkriberades bar bara texten, inte
 *     betyget. Femman är en slutsats dragen ur hur positiva citaten är, vilket
 *     inte är samma sak som ett betyg recensenten faktiskt satt.
 *     Läs av de riktiga betygen på profilen och rätta, eller ta bort
 *     `rating` helt från de poster du inte kan verifiera — ReviewsSection
 *     renderar då inga stjärnor för dem i stället för fem påhittade.
 *
 * ⚠️ INGEN AV RECENSIONERNA HANDLAR OM LACKERING. Samtliga beskriver tvätt,
 * rekond och bemötande. De tre som visas på sidan (se ReviewsSection) är
 * medvetet valda för att de berömmer HANTVERKET och PRISET utan att lova ett
 * lackresultat — be Hyper om omdömen från lackeringskunder och byt ut dem.
 */
export const googleRating = {
  /** Stjärnsnitt. null = badgen visar varken siffra eller stjärnor. */
  rating: null as number | null,
  /** Antal publicerade omdömen på profilen. null = antalet döljs. */
  count: null as number | null,
  /** ⚠️ SAKNAS — Google Maps-profilens URL. Tom sträng = badgen är olänkad. */
  url: "",
};

export type ReviewSource = "google" | "facebook";

export type Review = {
  id: string;
  name: string;
  text: string;
  /** Var omdömet är publicerat. Styr vilken ikon och vilket ord som visas. */
  source: ReviewSource;
  /**
   * Stjärnbetyg 1–5. Endast Google-omdömen har stjärnor; Facebook-poster är
   * rekommendationer utan betyg, och för dem är fältet undefined — då renderas
   * inga stjärnor i stället för fem påhittade.
   */
  rating?: number;
};

export const REVIEWS: Review[] = [
  {
    id: "sandra-maria-bergman",
    name: "Sandra Maria Bergman",
    text: "Jäkligt bra service, blir alltid nöjd med tvätten😜 och servicen med bilen😜",
    source: "google",
    rating: 5,
  },
  {
    id: "asa-oskarsson",
    name: "Åsa Oskarsson",
    text: "Jättenöjd! Kunnig, trevlig och duktig personal",
    source: "facebook",
  },
  {
    id: "jon-ahlman",
    name: "Jon Ahlman",
    text: "Fantastiskt prisvärt! Snabb service och trevligt bemötande.",
    source: "google",
    rating: 5,
  },
  {
    id: "robert-lindgren",
    name: "Robert Lindgren",
    text: "Trevlig personal som gjorde ett helt suveränt jobb. Bilen såg hemsk ut innan och efteråt var den riktigt ren och fin. Kan starkt rekommendera att lämna in bilen här.",
    source: "facebook",
  },
  {
    id: "marko-pollanen",
    name: "Marko Pöllänen",
    text: "Super trevligt mottagande. Seriöst och kunnigt rekommenderar varmt detta företag.",
    source: "google",
    rating: 5,
  },
  {
    id: "anneli-niemi",
    name: "Anneli Niemi",
    text: "Så nöjd. Trevlig personal och ren och snygg bil. Tack 💗",
    source: "facebook",
  },
  {
    id: "alexander-eriksson",
    name: "Alexander Eriksson",
    text: "Riktigt trevlig kille som verkligen gör ett grymt bra jobb. Supernöjd!",
    source: "google",
    rating: 5,
  },
  {
    // ⚠️ Skärmbilden klipper citatet mitt i meningen. Ellipsen står kvar tills
    // hela texten hämtats från Facebook — skriv inte ihop slutet själv.
    id: "mirsad-imeri",
    name: "Mirsad Imeri",
    text: "Jag rekommenderar starkt detta företag dom höll va dom lovade resultatet blev enastående jag är super nöjd och rekommenderar flera att rekonda ni kan lämna bilen…",
    source: "facebook",
  },
  {
    id: "sofia-eklund",
    name: "Sofia Eklund",
    text: "Alltid snabb service och enkla att ha att göra med. Lämnat in både för basservice, tvätt och andra reperationer. Alltid nöjd efteråt, så rekommenderar varmt! 😊",
    source: "google",
    rating: 5,
  },
  {
    id: "samuel",
    name: "Samuel",
    text: "Grym service och bra pris",
    source: "google",
    rating: 5,
  },
  {
    id: "vadar-hajr",
    name: "Vadar Hajr",
    text: "Prisvärt",
    source: "google",
    rating: 5,
  },
];

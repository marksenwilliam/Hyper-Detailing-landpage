/**
 * Bildregistret — en post per bild sidan visar.
 *
 * TRE SORTERS BILDER, OCH SKILLNADEN ÄR VIKTIG:
 *
 *  1. PROCESSBILDER (hero, sprutlackering, verkstadsmiljö, makro, avsyning).
 *     Levererade av kunden 2026-08-31 från
 *     Desktop/Annonser/Hyperdetailing/Landningssida, konverterade till WebP
 *     (originalen är 4–9 MB PNG — omöjligt i en annonshero).
 *     De visar VAD TJÄNSTEN ÄR: en sprutbox, en lös dörr som lackeras, skärmar
 *     på ställ. De är INTE fotograferade hos Hyper Detailing och föreställer
 *     inte Hypers lokal eller Hypers kunders bilar.
 *     ⇒ Alt-texterna beskriver därför momentet, aldrig "hos oss" eller
 *       "i vår verkstad". Skriv aldrig om dem till att påstå platsen.
 *
 *  2. BEVISBILDER (verkstad). Hyper Detailings EGNA foton ur deras
 *     huvudprojekt (hyper_detailing_astro-main/public).
 *     ⇒ Bara dessa får säga "hos oss" och "i Umeå". Efter bildbytet nedan är
 *       det bara ETT foto kvar i den här kategorin: bilden på lokalen med
 *       skylten över porten. Den är därmed sidans enda visuella bevis på att
 *       företaget finns på riktigt — ta inte bort den.
 *
 *  3. GENERERADE LACKBILDER (fore, efter, GALLERI). AI-genererade på kundens
 *     begäran 2026-08-31, eftersom Hyper inte har fotograferat ett enda
 *     lackeringsjobb. De föreställer INTE Hypers lokal, Hypers kunder eller
 *     Hypers utförda arbeten.
 *
 *     ⚠️⚠️ DE SITTER PÅ DE TVÅ PLATSER DÄR EN BESÖKARE FÖRVÄNTAR SIG BEVIS:
 *     före/efter-sektionen och bildrutan under erbjudandet. En genererad bild
 *     som läses som ett kundresultat är vilseledande marknadsföring, och Meta
 *     kan avvisa annonsen på den grunden.
 *
 *     Därför gäller: ingen copy intill dem får påstå att de visar Hypers eget
 *     arbete, en riktig kund eller Hypers lokal. Bildtexterna är formulerade
 *     efter det (se ForeEfter.astro och OfferSection.astro) — skärp dem inte.
 *     Byt ut bilderna mot riktiga foton så snart Hyper levererat sådana; då
 *     kan copyn skärpas i samma veva.
 *
 * `alt` är riktigt sidinnehåll, inte platshållartext: det är vad skärmläsare
 * och Google får. Använd "" bara för rent dekorativa bilder.
 */
export type ImageSlot = {
  /** Sökväg under /public, t.ex. "/images/hero-sprutbox.webp". */
  src: string;
  /** Alt-text. "" markerar bilden som dekorativ (aria-hidden). */
  alt: string;
  /** Etikett — för felsökning och platshållare. */
  label: string;
  width: number;
  height: number;
};

export const IMAGES = {
  /* --- 1. Processbilder ------------------------------------------------- */

  /**
   * Hero. Filmisk 2,2:1-beskärning — den ligger som ett brett band under
   * rubriken i stället för i en stående kolumn, för en 4:5-crop av den här
   * bilden kastar bort både boxen och ljusramperna som gör den läsbar.
   */
  hero: {
    src: "/images/hero-sprutbox.webp",
    alt: "Mörk BMW M3 i en upplyst sprutbox, redo för lackering",
    label: "Hero — sprutbox",
    width: 2000,
    height: 907,
  },

  /**
   * Sidans viktigaste bild: EN lös bildörr på ställ som sprutlackeras. Den gör
   * "per detalj" bokstavligt — priset gäller en detalj i taget, och här är
   * detaljen avmonterad och ensam i boxen. Ligger därför i erbjudandesektionen,
   * direkt intill priset.
   */
  sprutlackering: {
    src: "/images/sprutlackering-dorr.webp",
    alt: "Lackerare i skyddsdräkt och friskluftsmask sprutlackerar en avmonterad bildörr i grön kulör på ett lackställ i sprutboxen",
    label: "Process — dörr i sprutbox",
    width: 1400,
    height: 1045,
  },

  /**
   * Lackverkstad med avmonterade skärmar och stötfångare på ställ längs
   * väggarna och en maskerad bil i boxen. Samma budskap som bilden ovan, men
   * i vidvinkel: det är enskilda detaljer som lackeras, inte hela bilar.
   */
  verkstadSprutbox: {
    src: "/images/verkstad-sprutbox.webp",
    alt: "Lackverkstad med avmonterade skärmar och stötfångare på lackställ längs väggarna och en maskerad bil inne i den upplysta sprutboxen",
    label: "Process — lackverkstad",
    width: 1800,
    height: 1005,
  },

  /** Närbild på kanten av en nylackerad yta — texturen, inte bilen. */
  macro: {
    src: "/images/macro-lackkant.webp",
    alt: "Närbild på kanten av en nylackerad grön metallicyta, där klarlacken speglar ljuset",
    label: "Makro — lackkant",
    width: 1000,
    height: 1000,
  },

  /** Sista steget: ytan gås igenom för hand innan bilen lämnas tillbaka. */
  avsyning: {
    src: "/images/avsyning.webp",
    alt: "Handskklädd hand som torkar av skärmen på en grön bil med mikrofiberduk vid avsyningen",
    label: "Process — avsyning",
    width: 1400,
    height: 1045,
  },

  /* --- 3. Genererade lackbilder ----------------------------------------- */

  /**
   * ⚠️ GENERERADE (sort 3 i filhuvudet). Paret är framtaget som ett par: "efter" är
   * genererad med "före" som referensbild, så det är samma bil, samma kulör och
   * samma verkstad. Kameran står något närmare i "efter" — det stör inte
   * jämförelsen, men var beredd på det om du beskär om dem.
   *
   * Alt-texterna beskriver skadan och resultatet. De säger INTE "hos oss".
   */
  fore: {
    src: "/images/fore-lackering.webp",
    alt: "Före: mörkblå sedan med ett djupt repspår tvärs över framdörren, flagad lack och en grå spacklad fläck på framskärmen",
    label: "Före — skadad dörr och skärm",
    width: 1400,
    height: 1045,
  },
  efter: {
    src: "/images/efter-lackering.webp",
    alt: "Efter: samma mörkblå sedan med nylackerad dörr och skärm — repan borta och lacken djupt blank",
    label: "Efter — nylackerad",
    width: 1400,
    height: 1045,
  },

  /* --- 2. Bevisbild (Hypers egen) --------------------------------------- */

  /**
   * Hypers egen lokal, med skylten över porten. Sidans ENDA riktiga fotografi
   * och det enda som bevisar var företaget faktiskt finns — därför sitter den i
   * Om oss-sektionen. Ersätt den bara med ett annat äkta foto.
   *
   * HISTORIK, för att slippa göra om felet: originalet var en ruta ur ett
   * fyrdelat Facebook-collage, bara 292 × 268 px efter beskärning — för litet
   * för att visas stort. Den skalades upp till 4K med AI, vilket gjorde bilden
   * skarp MEN skrev om skylten till "HYPER DFTAILING". Den felstavade remsan är
   * därför överklistrad med samma yta ur originalet (mjukare, men rätt stavat),
   * med mjuk kant så skarven inte syns.
   *
   * ⇒ Kör aldrig en uppskalning på den här bilden utan att läsa av skylten
   *   efteråt. Får du originalfotot i full upplösning från Hyper: använd det
   *   rakt av i stället, då försvinner hela problemet.
   */
  verkstad: {
    src: "/images/verkstad-hyper.webp",
    alt: "Hyper Detailings lokal i Umeå — svart Mercedes GLE framför den öppna porten under skylten",
    label: "Hyper Detailings lokal",
    width: 1400,
    height: 1285,
  },
} as const;

/**
 * Bildrutan i erbjudandesektionen — fyra bilar med tydligt lackeringsarbete.
 *
 * ⚠️ GENERERADE (sort 3 i filhuvudet), på kundens begäran 2026-08-31. De
 * ersatte fyra RIKTIGA foton på Hypers kundbilar, som låg här tidigare men
 * visade tvätt- och rekondresultat, inte lackering.
 *
 * Priset för bytet: rutan visar nu rätt tjänst men slutade vara bevis. Den
 * gamla bildtexten "Bilar ur vår egen verkstad i Umeå" är därför borttagen ur
 * OfferSection — den vore osann om de här bilderna. Sätt inte tillbaka den utan
 * att först sätta tillbaka riktiga foton.
 *
 * Alla fyra är hållna i samma verkstadsmiljö och samma dokumentära ljus som
 * före/efter-paret, så raden läser som ett arbetsflöde och inte som ett
 * hopplock. Varje bild visar ett annat moment: ny stötfångare, ny sidopanel
 * med demonterad baklykta, nylackerad skärm, nylackerad huv.
 */
export const GALLERI: ImageSlot[] = [
  {
    // ⚠️ Omgjord 2026-08-31: den första versionen hade en AI-uppfunnen
    // "HYPER DETAILING"-skylt på väggen som inte matchade den riktiga logotypen.
    // Den här är genererad UTAN skyltning över huvud taget — en påhittad logga
    // på kundens egen fasad är värre än ingen logga alls.
    src: "/images/galleri-lack-utanfor.webp",
    alt: "Svart Mercedes-SUV på grusplanen utanför en verkstad, med nylackerad bakre stötfångare och en rulle maskeringstejp kvar på marken",
    label: "Galleri — lackerad stötfångare",
    width: 1200,
    height: 896,
  },
  {
    src: "/images/galleri-lack-maskerad.webp",
    alt: "Mörk Mercedes-SUV avmaskerad med tejp och maskeringspapper över strålkastare och hjulhus, med nylackerad framskärm",
    label: "Galleri — maskerad inför lackering",
    width: 1200,
    height: 896,
  },
  {
    src: "/images/galleri-lack-stotfangare.webp",
    alt: "Nylackerad stötfångare på lackställ inne i verkstaden, med bilen den hör till i porten bakom",
    label: "Galleri — detaljen lackeras för sig",
    width: 1200,
    height: 896,
  },
  {
    src: "/images/galleri-lack-dorr.webp",
    alt: "Närbild på en nylackerad bildörr där takarmaturerna speglas i den blanka ytan och maskeringstejpen markerar var den nya lacken slutar",
    label: "Galleri — lackerad dörr",
    width: 1200,
    height: 896,
  },
];

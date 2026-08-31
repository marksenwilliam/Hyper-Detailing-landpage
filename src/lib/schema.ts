import { BUSINESS } from "@/data/business";
import { PAKET } from "@/data/packages";
import { googleRating } from "@/data/reviews";
import { SITE_DESCRIPTION } from "@/data/site";

/**
 * JSON-LD för landningssidan.
 *
 * REGEL FÖR DEN HÄR FILEN: beskriv aldrig något sidan inte faktiskt visar, och
 * påstå aldrig något som inte går att belägga. Tre fält följer regeln genom att
 * utelämna sig själva hellre än att gissa:
 *
 *   telephone       — bara när numret inte längre är en platshållare.
 *   hasMap          — bara när det finns en riktig kartlänk.
 *   aggregateRating — bara när ett verifierat snitt finns. Google behandlar ett
 *                     obelagt betyg som en överträdelse mot riktlinjerna för
 *                     strukturerad data, och snittet i src/data/reviews.ts är
 *                     ännu inte avläst mot profilen.
 *
 * Erbjudandekatalogen speglar PAKET, som på den här sidan innehåller exakt ett
 * erbjudande — lackering. Mallens FAQPage-nod är borttagen tillsammans med
 * FAQ-sektionen: en FAQPage som speglar noll renderade frågor är ogiltig.
 */

type Node = Record<string, unknown>;

export const graph = (nodes: Node[]) => ({
  "@context": "https://schema.org",
  "@graph": nodes,
});

export const localBusinessNode = (image?: string): Node => ({
  // AutoPainting, inte AutoWash: den här sidan säljer lackering, och typen ska
  // spegla vad sidan faktiskt erbjuder. AutoBodyShop står med som bredare typ
  // eftersom lackering är karosseriarbete i Googles taxonomi.
  "@type": ["AutoPainting", "AutoBodyShop", "LocalBusiness"],
  "@id": `${BUSINESS.url}/#business`,
  name: BUSINESS.fullName,
  description: SITE_DESCRIPTION,
  url: BUSINESS.url,
  // `telephone` utelämnas helt så länge numret är en platshållare — ett
  // påhittat nummer i strukturerad data hamnar i Googles kunskapspanel och är
  // långt svårare att ta tillbaka än en rad på sidan. Se business.ts.
  ...(BUSINESS.phoneIsPlaceholder ? {} : { telephone: BUSINESS.phone.e164 }),
  email: BUSINESS.email,
  ...(image ? { image } : {}),
  address: {
    "@type": "PostalAddress",
    streetAddress: BUSINESS.address.street,
    postalCode: BUSINESS.address.postalCode,
    addressLocality: BUSINESS.address.locality,
    addressRegion: BUSINESS.address.region,
    addressCountry: BUSINESS.address.country,
  },
  // Utelämnas när kartlänken saknas — en tom hasMap är sämre än ingen.
  ...(BUSINESS.maps ? { hasMap: BUSINESS.maps } : {}),
  areaServed: BUSINESS.areaServed.map((name) => ({
    "@type": "City",
    name,
  })),
  // Emitted only once the star average has been confirmed against the Google
  // profile — see the header of src/data/reviews.ts.
  ...(googleRating.rating !== null
    ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: googleRating.rating,
          reviewCount: googleRating.count,
          bestRating: 5,
        },
      }
    : {}),
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Lackering",
    itemListElement: PAKET.map((paket) => ({
      "@type": "Offer",
      name: paket.name,
      description: paket.tagline,
      // Frånpris — modelleras som ett minimum, aldrig som ett fast pris,
      // eftersom sidan skriver "från" överallt och de två måste stämma överens.
      // unitText bär enheten: utan den läser 1500 SEK som ett pris för hela
      // bilen även maskinellt (claim rule 1 i packages.ts).
      priceSpecification: {
        "@type": "PriceSpecification",
        minPrice: paket.price,
        priceCurrency: "SEK",
        valueAddedTaxIncluded: true,
        unitText: paket.unit,
      },
      itemOffered: {
        "@type": "Service",
        // "Billackering", aldrig "Bilvård": den här sidan säljer lackering, och
        // typen sitter på varje erbjudandes egen Service-nod.
        serviceType: "Billackering",
        name: paket.name,
        provider: { "@id": `${BUSINESS.url}/#business` },
      },
    })),
  },
  ...(BUSINESS.social.facebook || BUSINESS.social.instagram
    ? {
        sameAs: [BUSINESS.social.facebook, BUSINESS.social.instagram].filter(
          Boolean,
        ),
      }
    : {}),
});

export const webSiteNode = (): Node => ({
  "@type": "WebSite",
  "@id": `${BUSINESS.url}/#website`,
  url: BUSINESS.url,
  name: BUSINESS.name,
  inLanguage: "sv-SE",
  publisher: { "@id": `${BUSINESS.url}/#business` },
});

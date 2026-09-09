# Hyper Detailing — landningssida för lackering

Betald annonssida (Meta) för **en enda tjänst**: sprutlackering av enskild
karossdel hos Hyper Detailing i Umeå.

**Erbjudandet:** från **1 500 kr per detalj**, ordinarie från 3 000 kr — halva
priset. Priset är ett *frånpris*: en större yta som en huv eller ett tak kostar
mer.

Byggd på Mönsterås Bilvårds landningssida som mall (samma bevisade
konverteringsstruktur), men allt kundinnehåll är utbytt.

---

## ⚠️ Blockerare före första annonskronan

Sidan är färdig att köra, men fyra saker måste bekräftas av Hyper först. De tre
första är de som faktiskt kan kosta pengar.

| # | Vad | Var | Varför det brådskar |
|---|-----|-----|---------------------|
| 1 | **Telefonnummer** — `090-123 45 67` är en platshållare, ärvd från huvudsajten | [`src/data/business.ts`](src/data/business.ts) | Sidan **döljer** numret i dag (`phoneIsPlaceholder: true`), så inget felaktigt nummer publiceras. Men besökare som vill ringa kan inte. Fyll i det riktiga och sätt spärren till `false` i **samma** commit. |
| 2 | **Ordinariepriset 3 000 kr** | [`src/data/packages.ts`](src/data/packages.ts) | Hypers publika sajt listar lackering till **2 000 kr** per detalj. Kampanjen ankrar mot 3 000. Ett ankarpris som inte stämmer med företagets egen prislista är en marknadsföringsrisk — ändra antingen här eller på huvudsajten, men låt dem inte säga olika. |
| 3 | **GHL-koppling** | `.env` | `GHL_PIT` och `GHL_LOCATION_ID` måste vara **Hypers egna**. Pekar de på Mönsterås sub-account hamnar Hypers betalda leads i en annan kunds CRM. |
| 4 | **Processtegen** ("Så går lackeringen till") | [`src/data/packages.ts`](src/data/packages.ts) → `LACKERING.includes` | Stegen beskriver vad en sprutlackering per definition innehåller, men är **inte** lästa av Hyper. Bekräfta särskilt: grundfärg alltid? demontering eller bara maskering? lackeras det i box? |

Dessutom saknas, utan att blockera: organisationsnummer, öppettider, Google
Maps-länk, sociala länkar och Google-betygets snitt/antal. Alla är markerade i
koden och **utelämnas hellre än gissas** — sidan renderar korrekt utan dem.

---

## Claim-regler

Reglerna står överst i [`src/data/packages.ts`](src/data/packages.ts) och gäller
all copy på sidan. De viktigaste:

1. **Alla priser är frånpriser, per detalj.** Varje siffra måste bära både
   "från" och "per detalj". Utan enheten läser 1 500 kr som ett pris för hela
   bilen — och då är klicket betalt och besviket i samma sekund.
2. **Ingen hållbarhet i år eller månader** för själva lackeringen, och inga
   garantiord. Endast det keramiska lackskyddet (tillvalet) får ange 8 år, och
   bara som Hypers egen prislista formulerar det.
3. **Inget "certifierad".** Ingen certifiering är verifierad.
4. **Ingen påhittad gåva.** `LACKERING_BONUS` är `null`; mallens
   "motortvätt på köpet" följde inte med. Varje gåv-rad i gränssnittet renderas
   villkorat, så fylls konstanten i dyker de upp av sig själva.
5. Svenskt talformat: `1 500 kr`, aldrig `1.500:-`. Tusentalsavgränsaren är
   U+00A0, satt av `formatKr()`.

Siffrorna räknas fram ur `price` / `originalPrice` — rabattprocenten, "spara
X kr" och "halva priset" är aldrig handskrivna. En prisändring kan därför inte
lämna ett gammalt påstående kvar.

---

## Bilderna — och varför de är uppdelade

Se [`src/data/images.ts`](src/data/images.ts). Tre sorter, och skillnaden är
inte kosmetisk:

- **Processbilder** (hero, dörren i sprutboxen, lackverkstaden, makro,
  avsyning) — levererade av kunden, konverterade från 4–9 MB PNG till WebP
  (36–144 kB). De visar *vad tjänsten är*. De är **inte** fotograferade hos
  Hyper, så alt-texterna säger aldrig "hos oss".
- **Bevisbild** (lokalen med skylten över porten) — Hypers eget foto. Sidans
  enda visuella bevis på att företaget finns på riktigt. Ta inte bort den.
- **Genererade lackbilder** (före/efter + de fyra i bildrutan) — AI-genererade
  2026-08-31 på beställning, eftersom Hyper inte har fotograferat ett enda
  lackeringsjobb.

⚠️ **De genererade bilderna sitter på sidans två bevisplatser.** En genererad
bild som läses som ett kundresultat är vilseledande marknadsföring, och Meta kan
avvisa annonsen på den grunden. Därför är copyn intill dem medvetet neutral: den
beskriver vad bilderna visar och påstår aldrig att det är Hypers arbete eller en
riktig kunds bil. Bildtexten "Bilar ur vår egen verkstad i Umeå" är borttagen —
sätt inte tillbaka den utan riktiga foton.

⇒ **Åtgärd:** be Hyper om foton från riktiga lackeringsjobb, helst ett
före/efter-par på samma detalj. Byt ut filerna i `images.ts` — sektionerna
behöver ingen kodändring, bara copyn får skärpas. Hypers riktiga kundfoton
ligger kvar i huvudprojektet under
`public/assets/photos/real-results/`.

Samma sak gäller omdömena: **inget av dem handlar om lackering**. De tre som
visas är valda för att de berömmer hantverket och priset utan att lova ett
lackresultat.

---

## Struktur

Sidan är en enda route med sektionerna i konverteringsordning:

```
topbar → hero → erbjudande → om oss → före/efter → så går det till → omdömen → kontakt
```

Ett erbjudande, en CTA upprepad fyra gånger, ett dialogformulär i två steg
(kontaktuppgifter → tillval + samtycke). Navbar, sidfotsmeny och FAQ är
**borttagna med flit**: sidans enda klickbara element är CTA-knapparna,
formuläret och länken till integritetspolicyn (den senare är juridik, inte
navigation — en Meta-annonsdestination utan nåbar policy riskerar kontot).

```
src/
  data/        business · packages · reviews · images · site   ← allt kundinnehåll bor här
  components/lp/   sektionerna + LeadDialog (formuläret)
  pages/       index · tack · integritet · 404 · api/lead.ts
  lib/         schema (JSON-LD) · utils (formatKr)
```

Vill du ändra pris, text eller bild: börja i `src/data/`. Komponenterna läser
därifrån och ska sällan behöva röras.

---

## Kom igång

```bash
npm install
npm run dev        # http://localhost:4321 (tar nästa lediga port om upptagen)
npm run build      # produktionsbygge + Vercel-adapter
```

Kopiera `.env.example` till `.env` och fyll i nycklarna. Utan dem fungerar
sidan lokalt, men formuläret kan inte leverera leads.

**Innan GHL slås på i produktion:** skapa de custom fields som listas överst i
[`src/pages/api/lead.ts`](src/pages/api/lead.ts) i sub-accountet. En `customField`
vars nyckel inte finns kan fälla hela upserten — vilket kostar en riktig,
betald lead.

---

## Spårning

- Leads taggas `hyper-lackering-lead` och får `source: hyper-lackering-lp`, så
  de går att skilja från Hypers övriga trafik.
- Meta Pixel `2610494469335172` är aktiverad i produktionsbygget via
  `src/data/site.ts`. `PUBLIC_META_PIXEL_ID` kan överrida standardvärdet för
  staging; lokal utveckling skickar inga PageViews utan en sådan override.
- Sidan är `noindex`. Den delar tjänst och priser med hyper-detailing.vercel.app,
  och två indexerade sidor som konkurrerar om samma sökord hjälper ingen.

# Rabat Rapport

Interaktiv rapport om marokkansk fotball. Teksten er hoveddelen. En globus nederst
til høyre følger teksten mens man leser: den roterer og zoomer fra hele jordkloden
til Marokko og videre ned til anleggene i Salé. Bildene vises øverst til høyre og kan
åpnes i stor visning.

Dette er en prototype og et konsept. Den er laget slik at den kan brukes som den er,
eller bygges inn i en annen plattform.

## Kom i gang

Krever Node.js 20 eller nyere.

```bash
npm install
npm run dev          # utviklingsserver på http://localhost:5173
npm run build        # ferdig nettside i dist/
npm run build:enkeltfil   # én HTML-fil med all kode og data, bildene ved siden av
```

`dist/` er en statisk nettside. Den trenger ingen server, database eller innlogging,
og kan legges på hvilken som helst webserver eller lagringstjeneste. Den må åpnes via
en webserver (ikke direkte som fil), fordi bildelisten lastes med `fetch`.

## Slik er prosjektet bygget opp

```
content/rapport.md        All tekst i rapporten (Markdown med styrekommentarer)
public/bilder/            Ferdige bilder og bilder.json (bildetekster, kapittel, kreditt)
bilder-original/          Originalbilder, én mappe per kapittel (sjekkes ikke inn)
src/js/main.js            Bygger sidene fra Markdown og kobler tekst, kart og bilder
src/js/globus.js          Globusen (d3-geo, ortografisk projeksjon på canvas)
src/js/kart-visninger.js  Kartvisningene: hvor globusen ser, zoom og lag
src/js/galleri.js         Bildepanel, bildestripe (mobil) og lysboks
src/data/                 Steder, Botola-tabell og forhåndsberegnede kartdata
src/css/rapport.css       Stil og fargetokens
scripts/                  Skript for kartdata og bildebehandling
```

### Innhold og styring

Teksten ligger i `content/rapport.md`. HTML-kommentarer styrer det interaktive:

| Kommentar | Virkning |
|---|---|
| `<!-- kapittel: lnfp -->` | Starter et kapittel. Id-en brukes i lenker og i `bilder.json`. |
| `<!-- kart: marokko-regionale -->` | Kartvisningen for avsnittene som følger. Se `src/js/kart-visninger.js`. |
| `<!-- komponent: botola-tabell -->` | Setter inn en interaktiv komponent (`sentre-liste`, `botola-tabell`). |
| `<!-- stil: fasiliteter -->` | Gir neste blokk en egen stil. |

Når et avsnitt passerer midten av skjermen, bytter globusen til visningen avsnittet
hører til. Det betyr at innhold, kartvisninger og bilder er skilt fra koden. I et
publiseringssystem (CMS) kan de samme feltene bli redigerbare: tekst, kartvisning per
avsnitt og bilder per kapittel. Globusen kan da gjenbrukes som en egen komponent.

### Kartvisninger

En kartvisning i `src/js/kart-visninger.js` beskriver:

```js
lnfp: {
  fokus: [-6.0, 32.9],   // [lengdegrad, breddegrad] i ankerpunktet
  skala: 4.2,            // globusens radius i forhold til skjermens korteste side
  anker: [0.74, 0.74],   // hvor på skjermen fokuspunktet havner (andel av bredde/høyde)
  lag: ["klubbyer"],     // lag som tegnes: buer, sentre, klubbyer, lokalt, anlegg
  uthev: [],             // id-er som fremheves
  interaktiv: true,      // musepeker gir verktøytips og utheving i tabellen
}
```

Overgangene mellom visninger beregnes automatisk: fokus flyttes langs storsirkelen og
zoomen interpoleres logaritmisk.

### Globusen

- **Teknikk:** [d3-geo](https://d3js.org/d3-geo) med ortografisk projeksjon, tegnet på
  `<canvas>`. Samme projeksjon brukes fra hele jordkloden og ned på bydelsnivå. Derfor
  blir all bevegelse én sammenhengende rotasjon og zoom, og globusen kan ligge delvis
  utenfor skjermen.
- **Data:** Natural Earth (fritt tilgjengelig) via `world-atlas`, og et utsnitt av
  Natural Earth 10m for Marokko (kyst, byområder og hovedveier). `npm run geodata`
  lager filene i `src/data/` på nytt. Ingen karttjeneste, API-nøkkel eller ekstern
  tilkobling trengs når siden kjører.
- **Presisjon:** Plasseringen av Mohammed VI Football Complex er hentet fra Wikidata,
  akademiets plassering er oppgitt av rapportforfatteren. Regionale sentre er plassert
  i sentrum av byene. Elva Bou Regreg er tegnet forenklet. Rettes i `src/data/steder.js`.

### Forside og innholdsfortegnelse

Forsiden bygger på designsystemet morocco-web-design og forsideskissen: flaggrød
radial gradient med zellige-mønster, flaggets grønne stjerne og tittelen i
Aref Ruqaa. Et svakt arabisk tekstbånd glir langsomt over skjermen, og globusen
stiger opp som en horisont med Marokko nærmest og Norge ute ved kanten. Den røde
flaten tones ut når man scroller videre.

I innholdsfortegnelsen viser globusen hele Marokko. Holder man over et kapittel
(eller går dit med Tab), viser globusen kapittelets kart.

### Bilder

1. Legg originalene i `bilder-original/<kapittel>/` (infrastruktur, kompleks, lnfp, akademi).
2. Kjør `npm run bilder`. Bildene roteres riktig, metadata (også GPS) fjernes, og det
   lages WebP i tre størrelser.
3. Fyll inn `tekst`, `alt` og `kreditt` i `public/bilder/bilder.json`.

Plassholderne for et kapittel forsvinner automatisk når kapittelet får ekte bilder.

## Avhengigheter og lisenser

| Pakke | Bruk | Lisens |
|---|---|---|
| d3-geo, d3-array | Projeksjon og geometri | ISC |
| topojson-client | Lesing av kartdata | ISC |
| world-atlas | Verdenskart (Natural Earth) | ISC, data i public domain |
| marked | Markdown til HTML | MIT |
| @fontsource/aref-ruqaa | Visningsskrift, levert fra egen server | SIL Open Font License 1.1 |
| vite, vite-plugin-singlefile | Bygg (kun utvikling) | MIT |
| sharp | Bildebehandling (kun utvikling) | Apache-2.0 |

Natural Earth-data er i public domain. Fonten leveres sammen med siden, ikke fra
Google Fonts. Ingen data sendes til tredjeparter når siden kjører, og siden bruker
ikke informasjonskapsler.

## Tilgjengelighet

- All informasjon fra kartet finnes også i tekst, liste eller tabell. Kartet er
  dekorativt for skjermlesere, og en usynlig statuslinje beskriver gjeldende kartvisning.
- Tastatur: alle knapper, tabellrader og bildevelgeren kan nås med Tab. Lysboksen
  lukkes med Esc og blas med piltastene.
- Ved «redusert bevegelse» i operativsystemet hopper kartet rett til ny visning, uten
  rotasjon og partikler.
- Tekstkontrast er minst 7:1 for brødtekst. Status vises aldri med farge alene.

## Nettlesere

Moderne Chrome, Edge, Safari og Firefox. Bruker `<dialog>`, `IntersectionObserver`
og canvas, uten polyfills.

// Kartvisningene i rapporten. Hver visning beskriver hvor globusen ser, hvor stor
// den er og hvilke lag som vises. Tekstens <!-- kart: id --> peker hit.
//
//   fokus   [lengdegrad, breddegrad] som havner i ankerpunktet
//   skala   globusens radius i forhold til den minste av skjermens bredde og høyde
//   anker   hvor på skjermen fokuspunktet havner, som andel av bredde og høyde
//           (mobil har egne verdier, der kartet ligger i et bånd øverst)
//   lag     hvilke lag som tegnes: buer, sentre, klubbyer, lokalt, anlegg
//   uthev   id-er som fremheves (sentre, anlegg)
//   roter   langsom svingning fram og tilbake (0 = stillestående, 1 = normal fart)

const DESKTOP_ANKER = [0.72, 0.6];
const MOBIL_ANKER = [0.5, 0.55];

// Kartet skal bevege seg bare når det tilfører noe. Derfor deler visningene
// to faste kameraer: ett over Marokko og ett over Rabat/Salé. Innenfor samme
// kamera står kartet stille, og bare uthevinger og lag tones inn og ut.
const MAROKKO = { fokus: [-5.9, 32.9], skala: 5, mobilSkala: 7.2, mobilAnker: [0.5, 0.5] };
const RABAT_SALE = { fokus: [-6.765, 34.005], skala: 240, anker: [0.7, 0.68] };

export const VISNINGER = {
  // Forsiden: globusen stiger opp som en horisont nederst på skjermen, med
  // Marokko nærmest og Norge ute ved kanten. På mobil vises hele kloden i
  // kartbåndet øverst.
  hero: {
    fokus: [2, -18],
    skala: 1.05,
    anker: [0.5, 1.75],
    mobilFokus: [2, 44],
    mobilAnker: [0.5, 0.54],
    mobilSkala: 0.42,
    lag: ["buer"],
    roter: 1,
    beskrivelse: "Globus med Marokko og linjer som går til Norge.",
  },
  // Innholdsfortegnelsen. Å holde over et kapittel viser kapittelets kart.
  oversikt: {
    ...MAROKKO,
    lag: ["sentre", "klubbyer"],
    beskrivelse: "Kart over Marokko med forbundets sentre og klubbyene i Botola Pro.",
  },
  "marokko-sale": {
    ...MAROKKO,
    lag: ["sentre"],
    uthev: ["sale"],
    beskrivelse: "Kart over Marokko. Det nasjonale anlegget i Salé er uthevet.",
  },
  "marokko-regionale": {
    ...MAROKKO,
    lag: ["sentre"],
    uthev: ["saidia", "ifrane", "ksar", "benimellal", "agadir"],
    beskrivelse: "Kart over Marokko med de fem regionale sentrene uthevet: Saïdia, Ifrane, Ksar El Kebir, Beni Mellal og Agadir.",
  },
  "marokko-alle": {
    ...MAROKKO,
    lag: ["sentre", "klubbyer"],
    beskrivelse: "Kart over Marokko med forbundets sentre og byene som har klubber i Botola Pro.",
  },
  "marokko-kvinner": {
    ...MAROKKO,
    lag: ["sentre"],
    uthev: ["sale"],
    beskrivelse: "Kart over Marokko. Det nasjonale anlegget i Salé er uthevet.",
  },
  kompleks: {
    ...RABAT_SALE,
    lag: ["lokalt", "anlegg"],
    uthev: ["kompleks"],
    beskrivelse: "Lokalkart over Rabat og Salé. Mohammed VI Football Complex er markert øst for Salé, nær flyplassen.",
  },
  lnfp: {
    ...MAROKKO,
    lag: ["klubbyer"],
    interaktiv: true,
    beskrivelse: "Kart over Marokko med en prikk for hver by som har klubb i Botola Pro. Tabellen i teksten viser de samme klubbene.",
  },
  akademi: {
    ...RABAT_SALE,
    lag: ["lokalt", "anlegg"],
    uthev: ["akademi"],
    beskrivelse: "Lokalkart over Rabat og Salé. Academie Mohammed VI de Football er markert på Salé-siden av Bou Regreg.",
  },
};

export function hentVisning(id, mobil) {
  const v = VISNINGER[id] || VISNINGER.hero;
  return {
    ...v,
    id,
    fokus: mobil ? v.mobilFokus || v.fokus : v.fokus,
    anker: mobil ? v.mobilAnker || MOBIL_ANKER : v.anker || DESKTOP_ANKER,
    skala: mobil ? v.mobilSkala || v.skala * 1.05 : v.skala,
    lag: v.lag || [],
    uthev: v.uthev || [],
    roter: v.roter || 0,
  };
}

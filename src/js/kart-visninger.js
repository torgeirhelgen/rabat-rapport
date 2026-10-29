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

export const VISNINGER = {
  // Forsiden: globusen stiger opp som en horisont nederst på skjermen, med
  // Marokko nærmest og Norge ute ved kanten.
  hero: {
    fokus: [2, -18],
    skala: 1.05,
    anker: [0.5, 1.75],
    mobilAnker: [0.5, 1.55],
    mobilSkala: 1.05,
    lag: ["buer"],
    roter: 1,
    beskrivelse: "Globus med Marokko i forgrunnen og linjer som går til Norge.",
  },
  // Innholdsfortegnelsen: Marokko med alle steder. Å holde over et kapittel
  // viser kapittelets kart.
  oversikt: {
    fokus: [-5.2, 33.2],
    skala: 2.4,
    lag: ["sentre", "klubbyer"],
    beskrivelse: "Kart over Marokko med forbundets sentre og klubbyene i Botola Pro.",
  },
  "marokko-sale": {
    fokus: [-6.0, 32.9],
    skala: 5,
    lag: ["sentre"],
    uthev: ["sale"],
    beskrivelse: "Kart over Marokko. Det nasjonale anlegget i Salé er uthevet.",
  },
  "marokko-regionale": {
    fokus: [-5.6, 32.9],
    skala: 5,
    lag: ["sentre"],
    uthev: ["saidia", "ifrane", "ksar", "benimellal", "agadir"],
    beskrivelse: "Kart over Marokko med de fem regionale sentrene uthevet: Saïdia, Ifrane, Ksar El Kebir, Beni Mellal og Agadir.",
  },
  "marokko-alle": {
    fokus: [-6.0, 32.9],
    skala: 5,
    lag: ["sentre", "klubbyer"],
    beskrivelse: "Kart over Marokko med forbundets sentre og byene som har klubber i Botola Pro.",
  },
  "marokko-kvinner": {
    fokus: [-6.0, 32.9],
    skala: 5,
    lag: ["sentre"],
    uthev: ["sale"],
    beskrivelse: "Kart over Marokko. Det nasjonale anlegget i Salé er uthevet.",
  },
  kompleks: {
    fokus: [-6.77, 34.025],
    skala: 200,
    anker: [0.7, 0.72],
    lag: ["lokalt", "anlegg"],
    uthev: ["kompleks"],
    beskrivelse: "Lokalkart over Rabat og Salé. Mohammed VI Football Complex er markert øst for Salé, nær flyplassen.",
  },
  lnfp: {
    fokus: [-6.0, 32.9],
    skala: 5,
    lag: ["klubbyer"],
    interaktiv: true,
    beskrivelse: "Kart over Marokko med en prikk for hver by som har klubb i Botola Pro. Tabellen i teksten viser de samme klubbene.",
  },
  akademi: {
    fokus: [-6.77, 33.99],
    skala: 200,
    anker: [0.7, 0.72],
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
    anker: mobil ? v.mobilAnker || MOBIL_ANKER : v.anker || DESKTOP_ANKER,
    skala: mobil ? v.mobilSkala || v.skala * 1.05 : v.skala,
    lag: v.lag || [],
    uthev: v.uthev || [],
    roter: v.roter || 0,
  };
}

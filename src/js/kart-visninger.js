// Kartvisningene i rapporten. Hver visning beskriver hvor globusen ser, hvor stor
// den er og hvilke lag som vises. Tekstens <!-- kart: id --> peker hit.
//
//   fokus   [lengdegrad, breddegrad] som havner i ankerpunktet
//   skala   globusens radius i forhold til den minste av skjermens bredde og høyde
//   anker   hvor på skjermen fokuspunktet havner, som andel av bredde og høyde
//           (mobil har egne verdier, der kartet ligger i et bånd øverst)
//   lag     hvilke lag som tegnes
//   uthev   id-er som fremheves (sentre, anlegg)
//   roter   langsom svingning fram og tilbake (0 = stillestående, 1 = normal fart)

const DESKTOP_ANKER = [0.74, 0.74];
const MOBIL_ANKER = [0.5, 0.55];

export const VISNINGER = {
  hero: {
    fokus: [0, 43],
    skala: 0.55,
    anker: [0.72, 0.78],
    mobilAnker: [0.5, 0.62],
    mobilSkala: 0.7,
    lag: ["buer"],
    roter: 1,
    beskrivelse: "Globus med Marokko i fokus og linjer som går til Norge.",
  },
  "marokko-sale": {
    fokus: [-6.0, 32.9],
    skala: 4.2,
    lag: ["sentre"],
    uthev: ["sale"],
    beskrivelse: "Kart over Marokko. Det nasjonale anlegget i Salé er uthevet.",
  },
  "marokko-regionale": {
    fokus: [-5.6, 32.9],
    skala: 4.2,
    lag: ["sentre"],
    uthev: ["saidia", "ifrane", "ksar", "benimellal", "agadir"],
    beskrivelse: "Kart over Marokko med de fem regionale sentrene uthevet: Saïdia, Ifrane, Ksar El Kebir, Beni Mellal og Agadir.",
  },
  "marokko-alle": {
    fokus: [-6.0, 32.9],
    skala: 4.2,
    lag: ["sentre", "klubbyer"],
    beskrivelse: "Kart over Marokko med forbundets sentre og byene som har klubber i Botola Pro.",
  },
  "marokko-kvinner": {
    fokus: [-6.0, 32.9],
    skala: 4.2,
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
    skala: 4.2,
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
  "akademi-rekruttering": {
    fokus: [-1.5, 42.5],
    skala: 1.15,
    lag: ["rekruttering"],
    beskrivelse: "Globus med en linje fra Nederland til akademiet i Salé.",
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

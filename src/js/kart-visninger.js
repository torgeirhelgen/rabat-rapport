// Kartvisningene i rapporten. Hver visning beskriver hvor globusen ser, hvor stor
// den er og hvilke lag som vises. Tekstens <!-- kart: id --> peker hit.
//
//   fokus     [lengdegrad, breddegrad] som havner i ankerpunktet
//   skala     globusens radius i forhold til den minste av skjermens bredde og høyde
//   anker     hvor på skjermen fokuspunktet havner, som andel av bredde og høyde.
//             På mobil er ankeret regnet innenfor kartbåndet øverst, unntatt
//             visninger med mobilHelskjerm, som bruker hele skjermen.
//   lag       hvilke lag som tegnes: buer, sentre, klubbyer, lokalt, anlegg
//   uthev     id-er som fremheves
//   etiketter "alle" (standard) eller "uthevet": bare uthevede steder får navn
//   roter     langsom svingning fram og tilbake (0 = stillestående, 1 = normal fart)

const DESKTOP_ANKER = [0.72, 0.6];
const MOBIL_ANKER = [0.5, 0.5];

// Kartet skal bevege seg bare når det tilfører noe. Derfor deler visningene
// to faste kameraer: ett over Marokko og ett over Rabat/Salé. Innenfor samme
// kamera står kartet stille, og bare uthevinger og lag tones inn og ut.
const MAROKKO = { fokus: [-5.9, 32.9], skala: 5, mobilSkala: 7.2 };
const RABAT_SALE = { fokus: [-6.765, 34.005], skala: 240, anker: [0.7, 0.68], mobilSkala: 250 };

const SENTER_IDER = ["sale", "saidia", "ifrane", "ksar", "benimellal", "agadir"];
const REGIONALE = ["saidia", "ifrane", "ksar", "benimellal", "agadir"];

export const VISNINGER = {
  // Forsiden: globusen stiger opp som en halvsirkel nederst på skjermen, med
  // Marokko nærmest og Norge ute ved kanten. Også på mobil.
  hero: {
    fokus: [2, -18],
    skala: 1.05,
    anker: [0.5, 1.75],
    mobilHelskjerm: true,
    mobilAnker: [0.5, 1.3],
    mobilSkala: 1.35,
    lag: ["buer"],
    roter: 1,
    beskrivelse: "Globus med Marokko og linjer som går til Norge.",
  },
  // Innholdsfortegnelsen: alle steder uten navn. Å holde over et kapittel
  // fremhever kapittelets steder med navn, uten at kartet beveger seg.
  oversikt: {
    ...MAROKKO,
    lag: ["sentre", "klubbyer"],
    etiketter: "uthevet",
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
    uthev: REGIONALE,
    beskrivelse: "Kart over Marokko med de fem regionale sentrene uthevet: Saïdia, Ifrane, Ksar El Kebir, Beni Mellal og Agadir.",
  },
  "marokko-alle": {
    ...MAROKKO,
    lag: ["sentre"],
    beskrivelse: "Kart over Marokko med det nasjonale anlegget i Salé og de fem regionale sentrene.",
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
    beskrivelse: "Lokalkart over Rabat og Salé. Academie Mohammed VI de Football er markert i Salé.",
  },
};

// Hva som fremheves på oversiktskartet når man holder over et kapittel i
// innholdsfortegnelsen. "klubbyer" betyr alle byene med klubb i Botola Pro.
export const FORHANDSVISNING = {
  infrastruktur: SENTER_IDER,
  kompleks: ["sale"],
  lnfp: "klubbyer",
  akademi: ["sale"],
};

// mobilbånd: { topp, hoyde } i piksler for kartbåndet øverst på mobil.
export function hentVisning(id, mobil, mobilbånd) {
  const v = VISNINGER[id] || VISNINGER.hero;
  let anker = v.anker || DESKTOP_ANKER;
  if (mobil) {
    const a = v.mobilAnker || MOBIL_ANKER;
    anker = v.mobilHelskjerm ? a : [a[0], (mobilbånd.topp + a[1] * mobilbånd.hoyde) / innerHeight];
  }
  return {
    ...v,
    id,
    anker,
    skala: mobil ? v.mobilSkala || v.skala : v.skala,
    lag: v.lag || [],
    uthev: v.uthev || [],
    etiketter: v.etiketter || "alle",
    roter: v.roter || 0,
  };
}

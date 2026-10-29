// Steder som vises på kartet. Koordinater er [lengdegrad, breddegrad].
// «presisjon» sier hvor sikker plasseringen er:
//   "anlegg" – anlegget selv (kilde oppgitt)
//   "by"     – sentrum av byen anlegget ligger i
//   "omtrentlig" – må bekreftes (vises med stiplet kant)

export const SENTRE = [
  {
    id: "sale",
    navn: "Mohammed VI Football Complex",
    sted: "Salé",
    type: "nasjonalt",
    beskrivelse: "Nasjonalt anlegg, åpnet 2019",
    koord: [-6.7252, 34.0252], // Wikidata Q40213986
    presisjon: "anlegg",
  },
  { id: "saidia", navn: "Saïdia", sted: "Saïdia", type: "regionalt", beskrivelse: "Første og mest etablerte regionale senter, ~120 spillere", koord: [-2.2392, 35.0857], presisjon: "by" },
  { id: "ifrane", navn: "Ifrane", sted: "Ifrane", type: "regionalt", beskrivelse: "Regionalt senter", koord: [-5.1167, 33.5333], presisjon: "by" },
  { id: "ksar", navn: "Ksar El Kebir", sted: "Ksar El Kebir", type: "regionalt", beskrivelse: "Regionalt senter", koord: [-5.9056, 35.0017], presisjon: "by" },
  { id: "benimellal", navn: "Beni Mellal", sted: "Beni Mellal", type: "regionalt", beskrivelse: "Regionalt senter", koord: [-6.3608, 32.3394], presisjon: "by" },
  { id: "agadir", navn: "Agadir", sted: "Agadir", type: "regionalt", beskrivelse: "Regionalt senter", koord: [-9.5981, 30.4278], presisjon: "by" },
];

export const ANLEGG = {
  kompleks: {
    navn: "Mohammed VI Football Complex",
    koord: [-6.7252, 34.0252], // Wikidata Q40213986
    radiusMeter: 300, // ~29 hektar
    presisjon: "anlegg",
  },
  akademi: {
    navn: "Academie Mohammed VI de Football",
    koord: [-6.74293, 33.97312], // Oppgitt av rapportforfatteren
    radiusMeter: 240, // ~18 hektar
    presisjon: "anlegg",
  },
};

// Orienteringspunkter for lokalkartet over Rabat/Salé.
export const LOKALT = {
  etiketter: [
    { navn: "Rabat", koord: [-6.8416, 34.0209], stor: true },
    { navn: "Salé", koord: [-6.7985, 34.0531], stor: true },
    { navn: "Atlanterhavet", koord: [-6.8, 34.12], hav: true },
  ],
  flyplass: { navn: "Rabat–Salé lufthavn", koord: [-6.7515, 34.0515] },
};

// Stemningsskapende linjer fra Marokko til Norge på forsiden.
export const BUER = {
  fra: [[-6.7252, 34.0252], [-2.2392, 35.0857], [-9.5981, 30.4278], [-5.0003, 34.0331], [-7.5898, 33.5731], [-5.1167, 33.5333]],
  til: [[10.75, 59.91], [5.32, 60.39], [10.39, 63.43], [5.73, 58.97], [18.96, 69.65], [8.0, 58.15]],
};

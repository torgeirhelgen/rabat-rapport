// Lager kartdata for globusen fra Natural Earth (public domain).
// Kjøres én gang: `npm run geodata`. Resultatet ligger i src/data/ og er sjekket inn,
// så det trengs ikke for å bygge eller kjøre rapporten.
import fs from "node:fs";
import path from "node:path";
import { feature } from "topojson-client";
import { geoContains } from "d3-geo";

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE = path.join(ROOT, ".cache/ne");
const OUT = path.join(ROOT, "src/data");
const NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/";

async function hent(navn) {
  const fil = path.join(CACHE, navn + ".geojson");
  if (!fs.existsSync(fil)) {
    fs.mkdirSync(CACHE, { recursive: true });
    const res = await fetch(NE + navn + ".geojson");
    if (!res.ok) throw new Error(`${navn}: ${res.status}`);
    fs.writeFileSync(fil, Buffer.from(await res.arrayBuffer()));
  }
  return JSON.parse(fs.readFileSync(fil, "utf8"));
}

const rund = (c) => (typeof c[0] === "number" ? [+c[0].toFixed(4), +c[1].toFixed(4)] : c.map(rund));
const innenfor = (b) => (c) =>
  typeof c[0] === "number" ? c[0] > b[0] && c[0] < b[2] && c[1] > b[1] && c[1] < b[3] : c.some(innenfor(b));

// 1. Prikkraster for landmassene på globusnivå. Avstanden i lengdegrad justeres
//    etter breddegrad, slik at prikkene ligger jevnt fordelt på kula.
const land = feature(
  JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules/world-atlas/land-110m.json"))),
  "land"
);
const STEG = 1.1;
const prikker = [];
for (let lat = -84; lat <= 84; lat += STEG) {
  const dLon = STEG / Math.max(Math.cos((lat * Math.PI) / 180), 0.2);
  for (let lon = -180; lon < 180; lon += dLon) {
    if (geoContains(land, [lon, lat])) prikker.push(+lon.toFixed(2), +lat.toFixed(2));
  }
}
fs.writeFileSync(path.join(OUT, "globus-prikker.json"), JSON.stringify(prikker));
console.log("globus-prikker:", prikker.length / 2);

// 2. Detaljer for Marokko og Rabat/Salé: byområder og hovedveier.
const MAROKKO = [-13.5, 27.5, -0.8, 36.2];
const urban = await hent("ne_10m_urban_areas");
const veier = await hent("ne_10m_roads");
const kyst = await hent("ne_10m_coastline");

// Kystlinjen deles opp slik at bare biter innenfor Marokko-utsnittet blir med.
const kystlinjer = [];
for (const f of kyst.features) {
  const linjer = f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const linje of linjer) {
    let bit = [];
    for (const c of linje) {
      if (innenfor(MAROKKO)(c)) bit.push(c);
      else if (bit.length) { if (bit.length > 1) kystlinjer.push(bit); bit = []; }
    }
    if (bit.length > 1) kystlinjer.push(bit);
  }
}
const detalj = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { type: "kyst" }, geometry: { type: "MultiLineString", coordinates: rund(kystlinjer) } },
    ...urban.features
      .filter((f) => innenfor(MAROKKO)(f.geometry.coordinates))
      .map((f) => ({ type: "Feature", properties: { type: "by" }, geometry: { ...f.geometry, coordinates: rund(f.geometry.coordinates) } })),
    ...veier.features
      .filter((f) => f.geometry && innenfor(MAROKKO)(f.geometry.coordinates))
      .filter((f) => f.properties.type === "Major Highway" || f.properties.type === "Road")
      .map((f) => ({
        type: "Feature",
        properties: { type: f.properties.type === "Major Highway" ? "motorvei" : "vei" },
        geometry: { ...f.geometry, coordinates: rund(f.geometry.coordinates) },
      })),
  ],
};
fs.writeFileSync(path.join(OUT, "marokko-detalj.json"), JSON.stringify(detalj));
console.log("marokko-detalj:", detalj.features.length, "objekter");

// Gjør originalbildene klare for nettet: `npm run bilder`.
//
// Legg originalene i bilder-original/<kapittel>/, der <kapittel> er en av
// infrastruktur, kompleks, lnfp, akademi. Skriptet
//   - roterer etter EXIF og fjerner all metadata (også GPS-posisjon)
//   - lager tre størrelser i WebP: stor (2000 px), mellom (1000 px), liten (360 px)
//   - oppdaterer public/bilder/bilder.json. Bildetekster du allerede har skrevet
//     der, blir beholdt. Nye bilder får tom tekst som du fyller inn.
// Plassholderne for et kapittel fjernes når kapittelet har ekte bilder.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const INN = path.join(ROOT, "bilder-original");
const UT = path.join(ROOT, "public/bilder");
const MANIFEST = path.join(UT, "bilder.json");
const KAPITLER = ["infrastruktur", "kompleks", "lnfp", "akademi"];
const STØRRELSER = { fil: 2000, mellom: 1000, liten: 360 };
const FORMATER = /\.(jpe?g|png|webp|heic|heif|tiff?)$/i;

const slug = (s) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const gammel = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")).bilder : [];
const etterId = new Map(gammel.map((b) => [b.id, b]));
const nye = [];

for (const kapittel of fs.readdirSync(INN).filter((d) => fs.statSync(path.join(INN, d)).isDirectory()).sort()) {
  if (!KAPITLER.includes(kapittel)) {
    console.warn(`Hopper over mappen «${kapittel}»: bruk en av ${KAPITLER.join(", ")}`);
    continue;
  }
  const filer = fs.readdirSync(path.join(INN, kapittel)).filter((f) => FORMATER.test(f)).sort();
  for (const f of filer) {
    const id = `${kapittel}-${slug(path.parse(f).name)}`;
    const kilde = path.join(INN, kapittel, f);
    const ut = {};
    for (const [nøkkel, bredde] of Object.entries(STØRRELSER)) {
      const navn = `${id}-${bredde}.webp`;
      ut[nøkkel] = navn;
      const mål = path.join(UT, navn);
      if (fs.existsSync(mål) && fs.statSync(mål).mtimeMs > fs.statSync(kilde).mtimeMs) continue;
      await sharp(kilde).rotate().resize({ width: bredde, withoutEnlargement: true }).webp({ quality: nøkkel === "liten" ? 70 : 82 }).toFile(mål);
    }
    const meta = await sharp(path.join(UT, ut.fil)).metadata();
    const før = etterId.get(id) || {};
    nye.push({
      id,
      kapittel,
      ...ut,
      bredde: meta.width,
      hoyde: meta.height,
      tekst: før.tekst ?? "",
      alt: før.alt ?? "",
      kreditt: før.kreditt ?? "",
    });
    console.log("✓", id);
  }
}

const medEkte = new Set(nye.map((b) => b.kapittel));
const behold = gammel.filter((b) => b.fil.startsWith("plassholder") && !medEkte.has(b.kapittel));
const bilder = [...behold, ...nye].sort((a, b) => KAPITLER.indexOf(a.kapittel) - KAPITLER.indexOf(b.kapittel));
fs.writeFileSync(MANIFEST, JSON.stringify({ bilder }, null, 2) + "\n");
console.log(`${nye.length} bilder behandlet. Fyll inn tekst, alt og kreditt i public/bilder/bilder.json.`);

// Globusen: en ortografisk projeksjon tegnet på canvas.
// Den samme projeksjonen brukes fra hele jordkloden og helt ned på bydelsnivå,
// så alle overganger er én sammenhengende bevegelse (rotasjon + zoom).

import {
  geoOrthographic, geoPath, geoGraticule, geoGraticule10, geoInterpolate,
  geoContains, geoCircle, geoDistance,
} from "d3-geo";
import { feature, mesh } from "topojson-client";
import verden from "world-atlas/countries-50m.json";
import prikkData from "../data/globus-prikker.json";
import detalj from "../data/marokko-detalj.json";
import { SENTRE, ANLEGG, LOKALT, BUER } from "../data/steder.js";
import { BYER, TABELL } from "../data/botola.js";

const RAD = Math.PI / 180;
const MAROKKO_ID = "504";
const NORGE_ID = "578";

const land = feature(verden, verden.objects.land);
const land50 = feature(verden, verden.objects.countries);
const grenser = mesh(verden, verden.objects.countries, (a, b) => a !== b);
const marokko = land50.features.find((f) => f.id === MAROKKO_ID);
const norge = land50.features.find((f) => f.id === NORGE_ID);
const lokaleTrekk = {
  kyst: detalj.features.filter((f) => f.properties.type === "kyst"),
  byer: detalj.features.filter((f) => f.properties.type === "by"),
  motorvei: detalj.features.filter((f) => f.properties.type === "motorvei"),
  vei: detalj.features.filter((f) => f.properties.type === "vei"),
};

// Klubbyer: én prikk per by, med klubbene som hører til.
const KLUBBYER = Object.entries(BYER).map(([by, koord]) => ({
  id: by,
  koord,
  klubber: TABELL.filter((r) => r.by === by),
}));

// Fargene leses fra CSS, slik at globusen følger samme tokens som resten av siden.
function lesFarger() {
  const s = getComputedStyle(document.documentElement);
  const v = (n) => s.getPropertyValue(n).trim();
  return {
    bg: v("--bg"),
    tekst: v("--text"),
    gull: v("--gold"),
    gullFyll: v("--gold-fill"),
    gronn: v("--accent"),
    vann: v("--water"),
    kule: v("--globe-surface"),
    kuleKant: v("--globe-edge"),
  };
}

const glatt = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

function xyz([lon, lat]) {
  const l = lon * RAD, p = lat * RAD, c = Math.cos(p);
  return [c * Math.cos(l), c * Math.sin(l), Math.sin(p)];
}

export class Globus {
  constructor(canvas, { redusertBevegelse = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.redusert = redusertBevegelse;
    this.farger = lesFarger();
    this.kamera = null;
    this.overgang = null;
    this.visning = null;
    this.lagAlfa = {}; // lag tones inn og ut
    this.uthevAlfa = {};
    this.hover = null;
    this.ekstraUthev = new Set();
    this.treff = [];
    this.svingFase = 0;
    this.svingAmplitude = 0;
    this.tid = 0;
    this.sistTid = performance.now();
    this.lyttere = { hover: [] };

    // Forhåndsberegnede 3D-vektorer for prikkene på globusen.
    const n = prikkData.length / 2;
    this.prikker = new Float32Array(n * 3);
    this.prikkType = new Uint8Array(n); // 0 = land, 1 = Marokko, 2 = Norge
    for (let i = 0; i < n; i++) {
      const p = [prikkData[2 * i], prikkData[2 * i + 1]];
      const v = xyz(p);
      this.prikker.set(v, i * 3);
      this.prikkType[i] = geoContains(marokko, p) ? 1 : geoContains(norge, p) ? 2 : 0;
    }

    this.buer = BUER.fra.map((fra, i) => {
      const til = BUER.til[i % BUER.til.length];
      return { fra, til, interp: geoInterpolate(fra, til), lengde: geoDistance(fra, til), fase: i / BUER.fra.length };
    });

    this.monster = this.lagMonster();
    this.storrelse();
    this.uthevStart = {};
    this.uthevMål = {};
    window.addEventListener("resize", () => {
      this.storrelse();
      this.skitten = true;
    });
    matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
      this.farger = lesFarger();
      this.monster = this.lagMonster();
    });
    this.tegnLoop = this.tegnLoop.bind(this);
    requestAnimationFrame(this.tegnLoop);
  }

  on(hendelse, fn) {
    this.lyttere[hendelse].push(fn);
  }

  storrelse() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    this.b = r.width;
    this.h = r.height;
    this.dpr = dpr;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Prikkmønster for flater (Marokko, byområder og anlegg).
  lagMonster() {
    const lag = (farge, str = 5, rad = 0.9) => {
      const c = document.createElement("canvas");
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = c.height = str * dpr;
      const x = c.getContext("2d");
      x.scale(dpr, dpr);
      x.fillStyle = farge;
      x.beginPath();
      x.arc(str / 2, str / 2, rad, 0, Math.PI * 2);
      x.fill();
      const m = this.ctx.createPattern(c, "repeat");
      m.setTransform?.(new DOMMatrix().scale(1 / dpr));
      return m;
    };
    return {
      gull: lag(this.farger.gull, 5, 1),
      tekst: lag(this.farger.tekst, 6, 0.8),
    };
  }

  // Bytter til en ny visning. Uten animasjon ved redusert bevegelse.
  settVisning(visning, { umiddelbar = false } = {}) {
    const forrige = this.visning;
    this.visning = visning;
    this.skitten = true;
    const mål = { fokus: visning.fokus, skala: visning.skala, anker: visning.anker };
    if (!this.kamera || umiddelbar || this.redusert) {
      this.kamera = { ...mål };
      this.overgang = null;
      return;
    }
    if (forrige && forrige.id === visning.id) return;
    // Samme kamera som vi allerede er på vei til: bare lagene endres, kartet står stille.
    const nåMål = this.overgang ? this.overgang.mål : this.kamera;
    const likt = (a, b) => Math.abs(a - b) < 1e-6;
    if (
      likt(nåMål.skala, mål.skala) && likt(nåMål.fokus[0], mål.fokus[0]) && likt(nåMål.fokus[1], mål.fokus[1]) &&
      likt(nåMål.anker[0], mål.anker[0]) && likt(nåMål.anker[1], mål.anker[1]) && !visning.roter && !forrige?.roter
    ) return;
    const fra = { ...this.kamera, fokus: this.naavaerendeFokus() };
    this.svingFase = 0;
    const zoomForhold = Math.abs(Math.log(mål.skala / fra.skala));
    const vinkel = geoDistance(fra.fokus, mål.fokus) / RAD;
    const varighet = Math.min(2800, 900 + zoomForhold * 260 + vinkel * 14);
    this.overgang = {
      fra,
      mål,
      start: performance.now(),
      varighet,
      interp: geoInterpolate(fra.fokus, mål.fokus),
      innzoom: mål.skala > fra.skala,
    };
  }

  // Fokus inkludert den langsomme svingningen på forsiden.
  naavaerendeFokus() {
    const k = this.kamera;
    return [k.fokus[0] + Math.sin(this.svingFase) * 16 * this.svingAmplitude, k.fokus[1]];
  }

  settUthev(ider) {
    this.ekstraUthev = new Set(ider || []);
  }

  oppdaterKamera(naa, dt) {
    const o = this.overgang;
    if (o) {
      const t = Math.min(1, (naa - o.start) / o.varighet);
      // Ved innzoom flyttes fokus først og zoomen kommer etter; motsatt ved utzoom.
      // Det gir en rolig bevegelse uten at kartet farer forbi på høy zoom.
      const tidlig = easeInOut(Math.min(1, t * 1.35));
      const sen = easeInOut(Math.max(0, (t - 0.26) / 0.74));
      const p = o.innzoom ? tidlig : sen;
      const z = o.innzoom ? sen : tidlig;
      this.kamera = {
        fokus: o.interp(p),
        skala: Math.exp(lerp(Math.log(o.fra.skala), Math.log(o.mål.skala), z)),
        anker: [lerp(o.fra.anker[0], o.mål.anker[0], easeInOut(t)), lerp(o.fra.anker[1], o.mål.anker[1], easeInOut(t))],
      };
      if (t >= 1) this.overgang = null;
    }
    const målAmp = this.redusert ? 0 : this.visning?.roter ? 1 : 0;
    this.svingAmplitude += (målAmp - this.svingAmplitude) * Math.min(1, dt * 1.5);
    if (this.svingAmplitude > 0.001) this.svingFase += dt * (2 * Math.PI / 70) * (this.visning?.roter || 1);
  }

  // Tonene for lag og uthevinger følger visningen mykt.
  oppdaterAlfa(dt) {
    const v = this.visning;
    let endret = false;
    const mål = (sett, nøkkel, på) => {
      const a = sett[nøkkel] ?? 0;
      const b = på ? 1 : 0;
      const ny = this.redusert || Math.abs(b - a) < 0.002 ? b : a + (b - a) * Math.min(1, dt * 4);
      if (ny !== a) endret = true;
      sett[nøkkel] = ny;
    };
    for (const l of ["buer", "sentre", "klubbyer", "lokalt", "anlegg"]) mål(this.lagAlfa, l, v.lag.includes(l));
    const uthev = new Set([...v.uthev, ...this.ekstraUthev]);
    const alle = [...SENTRE.map((s) => s.id), ...Object.keys(ANLEGG), ...KLUBBYER.map((k) => k.id)];
    for (const id of alle) {
      const på = uthev.has(id) || this.hover === id;
      // Pulsringen går noen få ganger når noe blir uthevet, og stopper så.
      if (på && !this.uthevMål[id]) this.uthevStart[id] = this.tid;
      this.uthevMål[id] = på;
      mål(this.uthevAlfa, id, på);
    }
    this.harUthev = uthev.size > 0 || !!this.hover;
    return endret;
  }

  // 1 rett etter utheving, tones ned til 0 i løpet av noen sekunder.
  pulsLiv(id) {
    if (this.redusert) return 0;
    const liv = Math.max(0, 1 - (this.tid - (this.uthevStart[id] ?? -99)) / 4.2);
    if (liv > 0) this.pulsAktiv = true;
    return liv;
  }

  lagProjeksjon() {
    const k = this.kamera;
    const R = k.skala * Math.min(this.b, this.h);
    const [lon0, lat0] = this.naavaerendeFokus();
    const cx = k.anker[0] * this.b, cy = k.anker[1] * this.h;
    const proj = geoOrthographic()
      .rotate([-lon0, -lat0])
      .scale(R)
      .translate([cx, cy])
      .clipAngle(90)
      .precision(R > 20000 ? 0.05 : 0.4);
    if (R > this.b) proj.clipExtent([[-20, -20], [this.b + 20, this.h + 20]]);

    // Basisvektorer for rask projeksjon av punkter, også over overflaten (buer).
    const v = xyz([lon0, lat0]);
    const l = lon0 * RAD, p = lat0 * RAD;
    const ost = [-Math.sin(l), Math.cos(l), 0];
    const nord = [-Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p)];
    const punkt = (koord, hoyde = 0) => {
      const q = xyz(koord);
      const d = q[0] * v[0] + q[1] * v[1] + q[2] * v[2];
      const f = R * (1 + hoyde);
      const x = cx + f * (q[0] * ost[0] + q[1] * ost[1] + q[2] * ost[2]);
      const y = cy - f * (q[0] * nord[0] + q[1] * nord[1] + q[2] * nord[2]);
      const synlig = d > 0 || Math.hypot(x - cx, y - cy) > R;
      return { x, y, d, synlig };
    };
    return { proj, R, cx, cy, v, ost, nord, punkt, pxPerGrad: R * RAD };
  }

  // Tegner bare når noe faktisk endrer seg: overgang, rotasjon, partikler,
  // inn- og uttoning eller pulsringer. Ellers står kartet stille og bruker ingen kraft.
  tegnLoop(naa) {
    const dt = Math.min(0.1, (naa - this.sistTid) / 1000);
    this.sistTid = naa;
    this.tid += dt;
    if (this.visning && !document.hidden) {
      this.oppdaterKamera(naa, dt);
      const alfaEndret = this.oppdaterAlfa(dt);
      const iBevegelse = this.overgang || this.svingAmplitude > 0.001 || (this.lagAlfa.buer > 0.01 && !this.redusert);
      if (iBevegelse || alfaEndret || this.pulsAktiv || this.skitten) {
        this.skitten = false;
        this.pulsAktiv = false;
        this.tegn();
      }
    }
    requestAnimationFrame(this.tegnLoop);
  }

  tegn() {
    const { ctx, b, h, farger: F } = this;
    const P = this.lagProjeksjon();
    const s = this.kamera.skala;
    const sti = geoPath(P.proj, ctx);
    this.treff = [];
    ctx.clearRect(0, 0, b, h);

    const globusAlfa = 1 - glatt(1.6, 4.5, s);
    const landAlfa = glatt(1.0, 2.6, s) * (1 - glatt(30, 80, s));
    const lokalAlfa = glatt(25, 70, s);

    // Kula: svak glød i kanten og en mørk flate.
    if (P.R < 4 * Math.max(b, h)) {
      const g = ctx.createRadialGradient(P.cx - P.R * 0.3, P.cy - P.R * 0.35, P.R * 0.05, P.cx, P.cy, P.R);
      g.addColorStop(0, F.kule);
      g.addColorStop(1, F.kuleKant);
      ctx.beginPath();
      ctx.arc(P.cx, P.cy, P.R, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.save();
      ctx.globalAlpha = 0.5 * globusAlfa + 0.15;
      ctx.strokeStyle = F.gull;
      ctx.lineWidth = 1;
      ctx.shadowColor = F.gull;
      ctx.shadowBlur = 24;
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = F.kule;
      ctx.fillRect(0, 0, b, h);
    }

    this.tegnGradnett(P, sti);

    // Prikkene på globusnivå.
    if (globusAlfa > 0.01) this.tegnPrikker(P, globusAlfa);

    // Land og grenser på landnivå.
    if (landAlfa > 0.01) {
      ctx.save();
      ctx.globalAlpha = landAlfa;
      ctx.beginPath();
      sti(land);
      ctx.fillStyle = "rgba(247, 241, 232, 0.05)";
      ctx.fill();
      ctx.beginPath();
      sti(grenser);
      ctx.strokeStyle = "rgba(247, 241, 232, 0.22)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.beginPath();
      sti(land);
      ctx.strokeStyle = "rgba(247, 241, 232, 0.28)";
      ctx.stroke();
      ctx.beginPath();
      sti(marokko);
      ctx.fillStyle = this.monster.gull;
      ctx.globalAlpha = landAlfa * 0.55;
      ctx.fill();
      ctx.globalAlpha = landAlfa;
      ctx.strokeStyle = F.gull;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
    }

    if (lokalAlfa > 0.01) this.tegnLokalt(P, sti, lokalAlfa);

    const a = this.lagAlfa;
    if (a.buer > 0.01) this.tegnBuer(P, this.buer, a.buer, 0.1);
    if (a.anlegg > 0.01) this.tegnAnlegg(P, sti, a.anlegg);
    if (a.klubbyer > 0.01) this.tegnKlubbyer(P, a.klubbyer);
    if (a.sentre > 0.01) this.tegnSentre(P, a.sentre);
  }

  tegnGradnett(P, sti) {
    const { ctx } = this;
    const steg = [10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01].find((st) => st * P.pxPerGrad <= 140) || 0.01;
    ctx.save();
    ctx.beginPath();
    if (steg >= 10) sti(geoGraticule10());
    else {
      const [lon0, lat0] = this.naavaerendeFokus();
      const dy = (Math.max(this.b, this.h) / P.pxPerGrad) * 1.2;
      const dx = dy / Math.max(0.2, Math.cos(lat0 * RAD));
      const rund = (x) => Math.round(x / steg) * steg;
      sti(geoGraticule().extent([[rund(lon0 - dx), rund(Math.max(-89, lat0 - dy))], [rund(lon0 + dx), rund(Math.min(89, lat0 + dy))]]).step([steg, steg])());
    }
    ctx.strokeStyle = this.farger.gull;
    ctx.globalAlpha = 0.09;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  tegnPrikker(P, alfa) {
    const { ctx, prikker, prikkType } = this;
    const { v, ost, nord, R, cx, cy } = P;
    const n = prikkType.length;
    const str = Math.max(1.1, Math.min(2.4, R / 260));
    const farger = [this.farger.tekst, this.farger.gull, this.farger.tekst];
    const grunnAlfa = [0.42, 1, 0.9];
    for (let type = 0; type < 3; type++) {
      ctx.fillStyle = farger[type];
      for (let i = 0; i < n; i++) {
        if (prikkType[i] !== type) continue;
        const o = i * 3;
        const x0 = prikker[o], y0 = prikker[o + 1], z0 = prikker[o + 2];
        const d = x0 * v[0] + y0 * v[1] + z0 * v[2];
        if (d <= 0.02) continue;
        const x = cx + R * (x0 * ost[0] + y0 * ost[1] + z0 * ost[2]);
        const y = cy - R * (x0 * nord[0] + y0 * nord[1] + z0 * nord[2]);
        if (x < -4 || y < -4 || x > this.b + 4 || y > this.h + 4) continue;
        ctx.globalAlpha = alfa * grunnAlfa[type] * (0.25 + 0.75 * d);
        const sz = type === 1 ? str * 1.3 : str;
        ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
      }
    }
    ctx.globalAlpha = 1;
  }

  tegnLokalt(P, sti, alfa) {
    const { ctx, farger: F } = this;
    ctx.save();
    ctx.globalAlpha = alfa;
    // Byområder som prikkflater.
    ctx.beginPath();
    for (const f of lokaleTrekk.byer) sti(f);
    ctx.fillStyle = this.monster.tekst;
    ctx.globalAlpha = alfa * 0.55;
    ctx.fill();
    ctx.globalAlpha = alfa;
    // Veier.
    ctx.beginPath();
    for (const f of lokaleTrekk.vei) sti(f);
    ctx.strokeStyle = "rgba(247, 241, 232, 0.22)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    for (const f of lokaleTrekk.motorvei) sti(f);
    ctx.strokeStyle = "rgba(247, 241, 232, 0.4)";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // Elv.
    ctx.beginPath();
    sti({ type: "LineString", coordinates: LOKALT.elv.linje });
    ctx.strokeStyle = F.vann;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    // Kyst.
    ctx.beginPath();
    for (const f of lokaleTrekk.kyst) sti(f);
    ctx.strokeStyle = F.gull;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = F.gull;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Flyplass.
    const fp = P.punkt(LOKALT.flyplass.koord);
    if (fp.synlig) {
      this.tegnFlyIkon(fp.x, fp.y, alfa);
      this.etikett(LOKALT.flyplass.navn, fp.x + 14, fp.y + 4, { alfa: alfa * 0.85, str: 12 });
    }
    // Elvenavn midt på linja.
    const mid = LOKALT.elv.linje[6];
    const ep = P.punkt(mid);
    this.etikett(LOKALT.elv.navn, ep.x + 12, ep.y + 2, { alfa: alfa * 0.8, str: 12, farge: F.vann, kursiv: true });
    for (const e of LOKALT.etiketter) {
      const p = P.punkt(e.koord);
      if (!p.synlig) continue;
      this.etikett(e.hav ? e.navn : e.navn.toUpperCase(), p.x, p.y, {
        alfa: alfa * (e.hav ? 0.55 : 0.85),
        str: e.stor ? 15 : 12,
        vekt: e.stor ? 700 : 400,
        sperring: e.hav ? 0 : 0.18,
        kursiv: e.hav,
        midtstilt: true,
      });
    }
    ctx.restore();
  }

  tegnFlyIkon(x, y, alfa) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = this.farger.tekst;
    ctx.beginPath();
    ctx.moveTo(0, -8); ctx.lineTo(1.6, -2); ctx.lineTo(8, 1.5); ctx.lineTo(8, 3); ctx.lineTo(1.6, 1.5);
    ctx.lineTo(1.2, 5.5); ctx.lineTo(3, 7); ctx.lineTo(3, 8); ctx.lineTo(0, 7); ctx.lineTo(-3, 8); ctx.lineTo(-3, 7);
    ctx.lineTo(-1.2, 5.5); ctx.lineTo(-1.6, 1.5); ctx.lineTo(-8, 3); ctx.lineTo(-8, 1.5); ctx.lineTo(-1.6, -2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Buer over overflaten med partikler som flyter langs dem.
  tegnBue(P, bue, alfa, hoyde, partikler = 3, tykkelse = 1.2) {
    const { ctx, farger: F } = this;
    const N = 72;
    const pkt = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      pkt.push(P.punkt(bue.interp(t), hoyde * Math.sin(Math.PI * t) * Math.min(1, bue.lengde * 2)));
    }
    ctx.save();
    ctx.lineWidth = tykkelse;
    ctx.strokeStyle = F.gull;
    for (let i = 1; i <= N; i++) {
      const a = pkt[i - 1], c = pkt[i];
      if (!a.synlig || !c.synlig) continue;
      ctx.globalAlpha = alfa * 0.35;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
    }
    // Partikler med hale.
    const fart = this.redusert ? 0 : 0.09;
    for (let j = 0; j < partikler; j++) {
      const t0 = (this.tid * fart + bue.fase + j / partikler) % 1;
      for (let k = 0; k < 10; k++) {
        const t = t0 - k * 0.012;
        if (t < 0) break;
        const p = pkt[Math.round(t * N)];
        if (!p || !p.synlig) continue;
        ctx.globalAlpha = alfa * (1 - k / 10) * 0.95;
        ctx.fillStyle = k === 0 ? F.tekst : F.gull;
        ctx.beginPath();
        ctx.arc(p.x, p.y, k === 0 ? 2.2 : 1.6 * (1 - k / 12), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Endepunkter.
    for (const [koord, r] of [[bue.fra, 2.4], [bue.til, 2]]) {
      const p = P.punkt(koord);
      if (!p.synlig) continue;
      ctx.globalAlpha = alfa;
      ctx.fillStyle = F.gull;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  tegnBuer(P, buer, alfa, hoyde) {
    for (const bue of buer) this.tegnBue(P, bue, alfa, hoyde);
  }

  tegnAnlegg(P, sti, alfa) {
    const { ctx, farger: F } = this;
    for (const [id, a] of Object.entries(ANLEGG)) {
      const u = this.uthevAlfa[id] || 0;
      const sirkel = geoCircle().center(a.koord).radius(a.radiusMeter / 6371000 / RAD)();
      const sentrum = P.punkt(a.koord);
      if (!sentrum.synlig) continue;
      ctx.save();
      ctx.globalAlpha = alfa * (0.45 + 0.55 * u);
      ctx.beginPath();
      sti(sirkel);
      ctx.fillStyle = this.monster.gull;
      ctx.fill();
      if (a.presisjon === "omtrentlig") ctx.setLineDash([5, 4]);
      ctx.strokeStyle = F.gull;
      ctx.lineWidth = 1.5 + u;
      ctx.stroke();
      ctx.setLineDash([]);
      // Pulsring rundt valgt anlegg.
      const livA = u > 0.05 ? this.pulsLiv(id) : 0;
      if (livA > 0) {
        const puls = (this.tid * 0.5) % 1;
        const r0 = (a.radiusMeter / 6371000) * P.R;
        ctx.globalAlpha = alfa * u * livA * (1 - puls) * 0.8;
        ctx.beginPath();
        ctx.arc(sentrum.x, sentrum.y, r0 * (1 + puls * 0.9), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      const r0 = (a.radiusMeter / 6371000) * P.R;
      const str = 13 + u * 2;
      this.ctx.font = `700 ${str}px ${getComputedStyle(document.body).fontFamily}`;
      // Etiketten legges til høyre, ellers til venstre, ellers midtstilt under anlegget.
      const bredde = this.ctx.measureText(a.navn).width;
      const hoyrePlass = sentrum.x + r0 + 12 + bredde < this.b - 16;
      const venstrePlass = sentrum.x - r0 - 12 - bredde > 16;
      const under = !hoyrePlass && !venstrePlass;
      const venstre = !hoyrePlass && venstrePlass;
      const x = under ? sentrum.x : venstre ? sentrum.x - r0 - 12 : sentrum.x + r0 + 12;
      const y0 = under ? sentrum.y + r0 + 20 : sentrum.y + (a.presisjon === "omtrentlig" ? -1 : 5);
      const felles = { hoyre: venstre, midtstilt: under, alfa: alfa * (0.6 + 0.4 * u) };
      this.etikett(a.navn, x, y0, {
        ...felles,
        str,
        vekt: u > 0.5 ? 700 : 500,
        farge: u > 0.5 ? F.gull : F.tekst,
      });
      if (a.presisjon === "omtrentlig") {
        this.etikett("Omtrentlig plassering", x, y0 + 16, { ...felles, str: 11.5, farge: F.tekst, kursiv: true });
      }
    }
  }

  tegnSentre(P, alfa) {
    const { ctx, farger: F } = this;
    for (const s of SENTRE) {
      const p = P.punkt(s.koord);
      if (!p.synlig) continue;
      const u = this.uthevAlfa[s.id] || 0;
      const demp = this.harUthev ? 0.45 + 0.55 * u : 1;
      ctx.save();
      ctx.globalAlpha = alfa * demp;
      if (s.type === "nasjonalt") {
        stjerne(ctx, p.x, p.y, 9 + u * 3, F.gull, F.bg);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5.5 + u * 2, 0, Math.PI * 2);
        ctx.fillStyle = u > 0.3 ? F.gull : F.bg;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = F.gull;
        ctx.stroke();
      }
      const livS = u > 0.05 ? this.pulsLiv(s.id) : 0;
      if (livS > 0) {
        const puls = (this.tid * 0.6) % 1;
        ctx.globalAlpha = alfa * u * livS * (1 - puls) * 0.7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8 + puls * 18, 0, Math.PI * 2);
        ctx.strokeStyle = F.gull;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.restore();
      const venstre = s.id === "ksar" || s.id === "sale";
      this.etikett(s.type === "nasjonalt" ? "Salé" : s.navn, venstre ? p.x - 14 : p.x + 14, p.y + 4, {
        alfa: alfa * demp,
        str: 13 + u * 2,
        vekt: u > 0.5 ? 700 : 500,
        hoyre: venstre,
        farge: u > 0.5 ? F.gull : F.tekst,
      });
      this.treff.push({ id: s.id, x: p.x, y: p.y, r: 16, tittel: s.navn, tekst: s.beskrivelse });
    }
  }

  tegnKlubbyer(P, alfa) {
    const { ctx, farger: F } = this;
    const interaktiv = this.visning.interaktiv;
    for (const by of KLUBBYER) {
      const p = P.punkt(by.koord);
      if (!p.synlig) continue;
      const u = this.uthevAlfa[by.id] || 0;
      const n = by.klubber.length;
      const r = 4 + Math.sqrt(n) * 3.2 + u * 2;
      const demp = this.harUthev ? 0.5 + 0.5 * u : 1;
      ctx.save();
      ctx.globalAlpha = alfa * demp * (interaktiv ? 1 : 0.6);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = u > 0.3 ? F.gronn : "rgba(247, 241, 232, 0.16)";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = u > 0.3 ? F.gronn : F.tekst;
      ctx.stroke();
      if (n > 1) {
        ctx.fillStyle = u > 0.3 ? F.bg : F.tekst;
        ctx.font = `700 ${11}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(n), p.x, p.y + 0.5);
      }
      ctx.restore();
      const visEtikett = P.pxPerGrad > 48 || u > 0.05;
      if (interaktiv) {
        const venstre = ["Dcheira", "Casablanca", "El Jadida", "Zemamra", "Safi", "Rabat", "Tanger", "Meknès"].includes(by.id);
        if (visEtikett) this.etikett(by.id, venstre ? p.x - r - 6 : p.x + r + 6, p.y + (by.id === "Dcheira" ? 14 : 4), {
          alfa: alfa * demp * (0.7 + 0.3 * u),
          str: 12 + u * 2,
          vekt: u > 0.5 ? 700 : 500,
          hoyre: venstre,
          farge: u > 0.5 ? F.gronn : F.tekst,
        });
        this.treff.push({
          id: by.id, x: p.x, y: p.y, r: Math.max(14, r + 4), tittel: by.id,
          tekst: by.klubber.map((k) => `${k.pos}. ${k.klubb} – ${k.poeng} p`).join("\n"),
        });
      }
    }
  }

  etikett(tekst, x, y, { alfa = 1, str = 13, vekt = 500, farge, hoyre = false, midtstilt = false, kursiv = false, sperring = 0 } = {}) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alfa));
    ctx.font = `${kursiv ? "italic " : ""}${vekt} ${str}px ${getComputedStyle(document.body).fontFamily}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${sperring}em`;
    ctx.textAlign = midtstilt ? "center" : hoyre ? "right" : "left";
    ctx.textBaseline = "alphabetic";
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.strokeStyle = this.farger.kuleKant;
    ctx.strokeText(tekst, x, y);
    ctx.fillStyle = farge || this.farger.tekst;
    ctx.fillText(tekst, x, y);
    ctx.restore();
  }

  // Treff for musepeker: nærmeste punkt innenfor radius.
  finnTreff(x, y) {
    let best = null, bestD = Infinity;
    for (const t of this.treff) {
      const d = Math.hypot(t.x - x, t.y - y);
      if (d < t.r && d < bestD) { best = t; bestD = d; }
    }
    return best;
  }

  settHover(id) {
    if (this.hover === id) return;
    this.hover = id;
    for (const fn of this.lyttere.hover) fn(id);
  }
}

// Femtakket stjerne som i Marokkos flagg, brukt for det nasjonale anlegget.
function stjerne(ctx, x, y, r, fyll, kant) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.42;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
  }
  ctx.closePath();
  ctx.fillStyle = fyll;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = kant;
  ctx.stroke();
}

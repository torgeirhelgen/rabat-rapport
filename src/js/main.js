import "@fontsource/aref-ruqaa/400.css";
import "@fontsource/aref-ruqaa/700.css";
import { marked } from "marked";
import rapport from "../../content/rapport.md?raw";
import { Globus } from "./globus.js";
import { hentVisning, FORHANDSVISNING } from "./kart-visninger.js";
import { lastBilder, Lysboks, Bildepanel, lagBildestripe } from "./galleri.js";
import { SENTRE } from "../data/steder.js";
import { TABELL, BYER } from "../data/botola.js";

const redusert = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobilMQ = matchMedia("(max-width: 959px)");

// Stjernen fra Marokkos flagg: et flettet pentagram.
const STJERNE = `<svg class="stjerne" viewBox="146 79.5 92 87.6" aria-hidden="true"><g>
  <path d="M181.25 113.188 146.469 113.219 186.062 141.969 192 137.656 168 120.219 178.969 120.188 181.25 113.188Z"/>
  <path d="M202.766 113.199 191.988 80.1296 176.88 126.67 182.816 130.984 191.984 102.77 195.403 113.192 202.766 113.199Z"/>
  <path d="M209.404 133.665 237.524 113.196 188.593 113.209 186.324 120.188 215.99 120.188 207.135 126.661 209.404 133.665Z"/>
  <path d="M191.99 146.302 220.147 166.721 205.014 120.189 197.676 120.188 206.843 148.402 197.951 141.98 191.99 146.302Z"/>
  <path d="M174.591 133.647 163.872 166.735 203.451 137.964 201.184 130.984 177.183 148.421 180.543 137.979 174.591 133.647Z"/>
</g></svg>`;

const INGRESSER = {
  infrastruktur: "Forbundet, staten og fem regionale sentre for spillerutvikling.",
  kompleks: "Det nasjonale anlegget i Salé, åpnet i 2019.",
  lnfp: "Ligaforeningen, klassifisering av utviklingsavdelinger og nasjonale aldersbestemte serier.",
  akademi: "Det selvstendige akademiet som regnes som landets beste utviklingsmiljø for gutter.",
};

// ---------- 1. Bygg kapitlene fra Markdown ----------

function byggKapitler(md) {
  const mal = document.createElement("template");
  mal.innerHTML = marked.parse(md);
  const kapitler = [];
  let kapittel = null, kart = null, stil = null;

  for (const node of [...mal.content.childNodes]) {
    if (node.nodeType === Node.COMMENT_NODE) {
      const m = node.data.trim().match(/^(kapittel|kart|komponent|stil):\s*(\S+)$/);
      if (!m) continue;
      const [, type, verdi] = m;
      if (type === "kapittel") {
        kapittel = { id: verdi, tittel: "", blokker: [] };
        kapitler.push(kapittel);
        kart = null;
      } else if (type === "kart") kart = verdi;
      else if (type === "stil") stil = verdi;
      else if (type === "komponent" && kapittel) {
        const el = document.createElement("div");
        el.dataset.komponent = verdi;
        if (kart) el.dataset.kart = kart;
        kapittel.blokker.push(el);
      }
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || !kapittel) continue;
    if (node.tagName === "H2") {
      kapittel.tittel = node.textContent;
      continue;
    }
    if (kart) node.dataset.kart = kart;
    if (stil) {
      node.classList.add(`stil-${stil}`);
      stil = null;
    }
    kapittel.blokker.push(node);
  }
  return kapitler;
}

function sentreListe() {
  const ul = document.createElement("ul");
  ul.className = "sentre-liste";
  ul.setAttribute("aria-label", "Forbundets anlegg og regionale sentre");
  for (const s of SENTRE) {
    const li = document.createElement("li");
    li.innerHTML = `
      <button type="button" class="sted-knapp" data-sted="${s.id}">
        <span class="sted-ikon ${s.type}" aria-hidden="true"></span>
        <span class="sted-navn">${s.type === "nasjonalt" ? "Salé" : s.navn}</span>
        <span class="sted-type">${s.type === "nasjonalt" ? "Nasjonalt anlegg" : "Regionalt senter"}</span>
      </button>`;
    ul.append(li);
  }
  return ul;
}

function botolaTabell() {
  const fig = document.createElement("figure");
  fig.className = "botola";
  fig.innerHTML = `
    <figcaption>
      <span class="kicker">Botola Pro 2025/26</span>
      <span class="botola-tittel">Sluttabell</span>
      <span class="botola-hjelp">Hold musepekeren over en klubb eller en by på kartet.</span>
    </figcaption>
    <div class="tabell-rull">
      <table>
        <thead><tr><th scope="col" class="tall">#</th><th scope="col">Klubb</th><th scope="col">By</th><th scope="col" class="tall">Poeng</th></tr></thead>
        <tbody>${TABELL.map(
          (r) => `<tr tabindex="0" data-by="${r.by}" class="${r.pos === 1 ? "er-mester" : ""} ${r.merknad?.startsWith("Nedrykk") ? "er-nedrykk" : ""}">
            <td class="tall">${r.pos}</td>
            <th scope="row">${r.klubb}${r.merknad ? `<span class="sr-only"> (${r.merknad.toLowerCase()})</span>` : ""}</th>
            <td>${r.by}</td>
            <td class="tall">${r.poeng}</td>
          </tr>`
        ).join("")}</tbody>
      </table>
    </div>
    <p class="kilde">Kilde: TNT Sports, Global Sports Archive og Wikipedia. Kawkab Marrakech og CODM Meknès endte på like mange poeng.</p>`;
  return fig;
}

const kapitler = byggKapitler(rapport);
const beholder = document.getElementById("kapitler");
const toc = document.getElementById("toc");
const nav = document.getElementById("nav-kapitler");

kapitler.forEach((k) => {
  const sek = document.createElement("section");
  sek.className = "kapittel";
  sek.id = k.id;
  sek.dataset.kapittel = k.id;
  sek.setAttribute("aria-labelledby", `${k.id}-tittel`);
  const hode = document.createElement("header");
  hode.className = "kapittel-hode";
  const forsteKart = k.blokker.find((b) => b.dataset.kart)?.dataset.kart || "hero";
  hode.dataset.kart = forsteKart;
  hode.innerHTML = `${STJERNE}<h2 id="${k.id}-tittel">${k.tittel}</h2>`;
  sek.append(hode, ...k.blokker);
  beholder.append(sek);

  toc.insertAdjacentHTML(
    "beforeend",
    `<li><a href="#${k.id}" data-forhandsvis="${k.id}">${STJERNE}<span class="toc-tittel">${k.tittel}</span><span class="toc-ingress">${INGRESSER[k.id] || ""}</span></a></li>`
  );
  nav.insertAdjacentHTML("beforeend", `<li><a href="#${k.id}" data-nav="${k.id}">${k.tittel}</a></li>`);
});

document.querySelectorAll('[data-komponent="sentre-liste"]').forEach((el) => el.append(sentreListe()));
document.querySelectorAll('[data-komponent="botola-tabell"]').forEach((el) => el.append(botolaTabell()));

// ---------- 2. Globus ----------

const globus = new Globus(document.getElementById("globus"), { redusertBevegelse: redusert });
const kartStatus = document.getElementById("kart-status");
let aktivVisning = "hero";

// Kartbåndet øverst på mobil, målt fra CSS (topplinje + --kart-hoyde).
function mobilbånd() {
  const r = document.querySelector(".kartbaand-maal").getBoundingClientRect();
  return { topp: r.top, hoyde: r.height };
}

function visKart(id, umiddelbar = false) {
  aktivVisning = id;
  globus.settUthev([]);
  const v = hentVisning(id, mobilMQ.matches, mobilbånd());
  globus.settVisning(v, { umiddelbar });
  document.body.dataset.kart = id;
  if (v.beskrivelse && kartStatus.textContent !== v.beskrivelse) kartStatus.textContent = v.beskrivelse;
}
visKart("hero", true);
mobilMQ.addEventListener("change", () => visKart(aktivVisning, true));
addEventListener("resize", () => {
  if (mobilMQ.matches) visKart(aktivVisning, true);
});

// Innholdsfortegnelsen: å holde over et kapittel fremhever kapittelets steder
// på oversiktskartet, uten at kartet zoomer eller flytter seg.
let forhandsvisning = null;
function forhandsvis(kapittel) {
  clearTimeout(forhandsvisning);
  forhandsvisning = setTimeout(() => {
    if (aktivVisning !== "oversikt") return;
    const ider = FORHANDSVISNING[kapittel];
    globus.settUthev(ider === "klubbyer" ? Object.keys(BYER) : ider || []);
  }, kapittel ? 80 : 150);
}
toc.addEventListener("pointerover", (e) => {
  const a = e.target.closest("[data-forhandsvis]");
  if (a) forhandsvis(a.dataset.forhandsvis);
});
toc.addEventListener("pointerleave", () => forhandsvis(null));
toc.addEventListener("focusin", (e) => {
  const a = e.target.closest("[data-forhandsvis]");
  if (a) forhandsvis(a.dataset.forhandsvis);
});
toc.addEventListener("focusout", (e) => {
  if (!toc.contains(e.relatedTarget)) forhandsvis(null);
});

// Samspill mellom tekst (liste og tabell) og kart.
function uthevFraTekst(ider) {
  globus.settUthev(ider);
  const sett = new Set(ider);
  document.querySelectorAll("tr[data-by]").forEach((tr) => tr.classList.toggle("er-uthevet", sett.has(tr.dataset.by)));
}
document.addEventListener("pointerover", (e) => {
  const sted = e.target.closest?.("[data-sted]");
  const rad = e.target.closest?.("tr[data-by]");
  if (sted) uthevFraTekst([sted.dataset.sted]);
  else if (rad) uthevFraTekst([rad.dataset.by]);
});
document.addEventListener("pointerout", (e) => {
  if (e.target.closest?.("[data-sted], tr[data-by]")) uthevFraTekst([]);
});
document.addEventListener("focusin", (e) => {
  const sted = e.target.closest?.("[data-sted]");
  const rad = e.target.closest?.("tr[data-by]");
  uthevFraTekst(sted ? [sted.dataset.sted] : rad ? [rad.dataset.by] : []);
});

// Treff på kartet med musepeker: verktøytips og utheving i tabellen.
const tips = document.getElementById("kart-tips");
const canvas = document.getElementById("globus");
window.addEventListener("pointermove", (e) => {
  if (e.pointerType === "touch") return;
  const r = canvas.getBoundingClientRect();
  const over = document.elementFromPoint(e.clientX, e.clientY);
  const fritt = over === canvas;
  const t = fritt ? globus.finnTreff(e.clientX - r.left, e.clientY - r.top) : null;
  globus.settHover(t?.id || null);
  document.body.classList.toggle("peker-paa-kart", !!t);
  if (t) {
    tips.hidden = false;
    tips.innerHTML = `<strong>${t.tittel}</strong>${t.tekst ? `<span>${t.tekst.replace(/\n/g, "<br>")}</span>` : ""}`;
    const x = Math.min(e.clientX + 16, innerWidth - tips.offsetWidth - 12);
    const y = Math.min(e.clientY + 16, innerHeight - tips.offsetHeight - 12);
    tips.style.transform = `translate(${x}px, ${y}px)`;
  } else tips.hidden = true;
});
globus.on("hover", (id) => {
  document.querySelectorAll("tr[data-by]").forEach((tr) => tr.classList.toggle("er-uthevet", tr.dataset.by === id));
  document.querySelectorAll("[data-sted]").forEach((b) => b.classList.toggle("er-uthevet", b.dataset.sted === id));
});

// ---------- 3. Scrollstyring ----------
// Elementet som krysser en linje litt over midten av skjermen bestemmer kartvisningen.

const kartElementer = [...document.querySelectorAll("main [data-kart]")];
let aktivtKapittel = null;

// Linjen på skjermen som bestemmer hva som er aktivt. Et avsnitt eller en
// kapitteltittel blir aktiv når toppen passerer linjen. På desktop ligger den
// godt nede på skjermen, så kartet bytter når neste tittel er synlig. På mobil
// ligger den i tekstfeltet under kartbåndet, så tittelen aldri skjules bak
// kartet før kapittelet bytter.
function aktivLinje() {
  if (!mobilMQ.matches) return innerHeight * 0.7;
  const { topp, hoyde } = mobilbånd();
  const bunn = topp + hoyde;
  return bunn + (innerHeight - bunn) * 0.55;
}

function bestemAktiv() {
  const linje = aktivLinje();
  let aktiv = null;
  for (const el of kartElementer) {
    if (el.getBoundingClientRect().top <= linje) aktiv = el;
    else break;
  }
  // Over første kapittel: forsiden helt øverst, ellers oversikten over Marokko.
  // På mobil venter kartet til forsiden nesten er borte, så det ikke dekker tittelen.
  const forsideGrense = innerHeight * (mobilMQ.matches ? 0.38 : 0.12);
  const id = aktiv ? aktiv.dataset.kart : scrollY < forsideGrense ? "hero" : "oversikt";
  if (id !== aktivVisning) visKart(id);
  const kap = aktiv?.closest("[data-kapittel]")?.dataset.kapittel || null;
  if (kap !== aktivtKapittel) settKapittel(kap);
}

// Fremdriftslinje, forsidetoning og aktiv visning, maks én gang per bilde.
const fremdrift = document.getElementById("fremdrift");
let ventendeScroll = false;
function vedScroll() {
  ventendeScroll = false;
  const maks = document.documentElement.scrollHeight - innerHeight;
  fremdrift.style.transform = `scaleX(${maks > 0 ? scrollY / maks : 0})`;
  // Den røde forsiden tones ut i løpet av den første delen av scrollingen.
  const andel = Math.min(1, Math.max(0, 1 - scrollY / (innerHeight * 0.45)));
  document.documentElement.style.setProperty("--forside", andel.toFixed(3));
  document.body.classList.toggle("paa-forside", andel > 0.35);
  bestemAktiv();
}
addEventListener(
  "scroll",
  () => {
    if (!ventendeScroll) {
      ventendeScroll = true;
      requestAnimationFrame(vedScroll);
    }
  },
  { passive: true }
);
addEventListener("resize", () => requestAnimationFrame(vedScroll));

// ---------- 4. Bilder ----------

const lysboks = new Lysboks(document.getElementById("lysboks"));
const panel = new Bildepanel(document.getElementById("galleri"), lysboks);
const bilderPerKapittel = new Map();

lastBilder().then((bilder) => {
  for (const k of kapitler) {
    const liste = bilder.filter((b) => b.kapittel === k.id);
    bilderPerKapittel.set(k.id, liste);
    if (liste.length) {
      const hode = document.querySelector(`#${k.id} .kapittel-hode`);
      hode.after(lagBildestripe(liste, lysboks));
    }
  }
  settKapittel(aktivtKapittel, true);
});

const TOM = [];
function settKapittel(id, tving = false) {
  if (id === aktivtKapittel && !tving) return;
  aktivtKapittel = id;
  panel.settBilder(bilderPerKapittel.get(id) || TOM);
  document.querySelectorAll("[data-nav]").forEach((a) => {
    if (a.dataset.nav === id) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  });
  document.getElementById("nav-naa").textContent = id ? kapitler.find((k) => k.id === id)?.tittel : "";
}

vedScroll();

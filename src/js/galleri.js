// Bildevelger og forstørret visning (lysboks).
// Bildene og bildetekstene ligger i public/bilder/bilder.json.

const BASE = import.meta.env.BASE_URL;
const url = (fil) => `${BASE}bilder/${fil}`;

export async function lastBilder() {
  try {
    const res = await fetch(url("bilder.json"));
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    return data.bilder || [];
  } catch (e) {
    console.warn("Fant ikke bilder.json", e);
    return [];
  }
}

function bildeTekst(b) {
  return [b.tekst, b.kreditt ? `Foto: ${b.kreditt}` : ""].filter(Boolean).join(" · ");
}

export class Lysboks {
  constructor(dialog) {
    this.d = dialog;
    this.img = dialog.querySelector("img");
    this.tekst = dialog.querySelector(".lysboks-tekst");
    this.teller = dialog.querySelector(".lysboks-teller");
    this.liste = [];
    this.i = 0;
    dialog.querySelector("[data-lukk]").addEventListener("click", () => this.lukk());
    dialog.querySelector("[data-forrige]").addEventListener("click", () => this.bla(-1));
    dialog.querySelector("[data-neste]").addEventListener("click", () => this.bla(1));
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog || e.target.classList.contains("lysboks-scene")) this.lukk();
    });
    dialog.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") this.bla(-1);
      if (e.key === "ArrowRight") this.bla(1);
    });
    // Sveip på berøringsskjerm.
    let startX = null;
    dialog.addEventListener("pointerdown", (e) => (startX = e.clientX));
    dialog.addEventListener("pointerup", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 50) this.bla(dx < 0 ? 1 : -1);
      startX = null;
    });
  }

  aapne(liste, i, kilde) {
    this.liste = liste;
    this.kilde = kilde;
    this.vis(i);
    this.d.showModal();
    document.documentElement.classList.add("lysboks-aapen");
  }

  lukk() {
    this.d.close();
    document.documentElement.classList.remove("lysboks-aapen");
    this.kilde?.focus();
  }

  bla(steg) {
    if (this.liste.length < 2) return;
    this.vis((this.i + steg + this.liste.length) % this.liste.length);
  }

  vis(i) {
    this.i = i;
    const b = this.liste[i];
    this.img.src = url(b.fil);
    this.img.alt = b.alt || b.tekst || "";
    this.tekst.textContent = bildeTekst(b);
    this.teller.textContent = `${i + 1} / ${this.liste.length}`;
    const flere = this.liste.length > 1;
    this.d.querySelectorAll("[data-forrige],[data-neste]").forEach((k) => (k.hidden = !flere));
    // Last neste bilde på forhånd.
    if (flere) new Image().src = url(this.liste[(i + 1) % this.liste.length].fil);
  }
}

// Bildepanelet øverst til høyre (desktop).
export class Bildepanel {
  constructor(el, lysboks) {
    this.el = el;
    this.lysboks = lysboks;
    this.hoved = el.querySelector(".galleri-hoved");
    this.img = this.hoved.querySelector("img");
    this.tekst = el.querySelector(".galleri-tekst");
    this.teller = el.querySelector(".galleri-teller");
    this.miniatyrer = el.querySelector(".galleri-miniatyrer");
    this.liste = [];
    this.i = 0;
    this.hoved.addEventListener("click", () => this.lysboks.aapne(this.liste, this.i, this.hoved));
    el.querySelector("[data-forrige]").addEventListener("click", () => this.vis(this.i - 1));
    el.querySelector("[data-neste]").addEventListener("click", () => this.vis(this.i + 1));
  }

  settBilder(liste) {
    if (liste === this.liste) return;
    this.liste = liste;
    this.el.classList.toggle("er-tom", liste.length === 0);
    this.el.setAttribute("aria-hidden", liste.length === 0 ? "true" : "false");
    this.el.inert = liste.length === 0;
    this.miniatyrer.replaceChildren(
      ...liste.map((b, i) => {
        const knapp = document.createElement("button");
        knapp.type = "button";
        knapp.className = "miniatyr";
        knapp.setAttribute("aria-label", `Vis bilde ${i + 1}: ${b.tekst || ""}`);
        const img = document.createElement("img");
        img.src = url(b.liten || b.fil);
        img.alt = "";
        img.loading = "lazy";
        knapp.append(img);
        knapp.addEventListener("click", () => this.vis(i));
        return knapp;
      })
    );
    this.el.querySelectorAll("[data-forrige],[data-neste]").forEach((k) => (k.hidden = liste.length < 2));
    if (liste.length) this.vis(0);
  }

  vis(i) {
    const n = this.liste.length;
    this.i = (i + n) % n;
    const b = this.liste[this.i];
    this.img.classList.remove("er-lastet");
    this.img.onload = () => this.img.classList.add("er-lastet");
    this.img.src = url(b.mellom || b.fil);
    this.img.alt = b.alt || b.tekst || "";
    this.hoved.setAttribute("aria-label", `Åpne bildet i stor visning: ${b.tekst || ""}`);
    this.tekst.textContent = bildeTekst(b);
    this.teller.textContent = `${this.i + 1} / ${n}`;
    [...this.miniatyrer.children].forEach((k, j) => k.setAttribute("aria-current", j === this.i ? "true" : "false"));
  }
}

// Bildestripe inne i teksten (mobil og smale skjermer).
export function lagBildestripe(liste, lysboks) {
  const wrap = document.createElement("div");
  wrap.className = "bildestripe";
  wrap.setAttribute("role", "list");
  wrap.setAttribute("aria-label", "Bilder fra kapittelet");
  liste.forEach((b, i) => {
    const knapp = document.createElement("button");
    knapp.type = "button";
    knapp.className = "bildestripe-bilde";
    knapp.setAttribute("role", "listitem");
    knapp.setAttribute("aria-label", `Åpne bilde ${i + 1}: ${b.tekst || ""}`);
    const img = document.createElement("img");
    img.src = url(b.mellom || b.fil);
    img.alt = "";
    img.loading = "lazy";
    knapp.append(img);
    knapp.addEventListener("click", () => lysboks.aapne(liste, i, knapp));
    wrap.append(knapp);
  });
  return wrap;
}

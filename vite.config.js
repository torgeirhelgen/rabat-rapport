import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Vanlig bygg: `npm run build` → dist/ (index.html + assets/ + bilder/).
// Enkeltfil: `npm run build:enkeltfil` → dist-enkeltfil/ der all kode og data
// ligger i index.html, mens bildene ligger ved siden av i bilder/.
// base: "./" gir relative stier, så siden fungerer fra hvilken som helst mappe.
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: mode === "enkeltfil" ? [viteSingleFile()] : [],
  build: {
    outDir: mode === "enkeltfil" ? "dist-enkeltfil" : "dist",
    // Enkeltfil: også fontene legges inn i HTML-filen.
    assetsInlineLimit: mode === "enkeltfil" ? 100_000_000 : 0,
    // Kartdataene (verdenskart og Marokko-detaljer) utgjør mesteparten av JS-filen.
    chunkSizeWarningLimit: 1500,
  },
}));

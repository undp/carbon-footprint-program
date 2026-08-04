#!/usr/bin/env node
/*
 * exportar-pdf.cjs — Exporta un manual HTML tipo slides a PDF.
 *
 * Uso:
 *   node exportar-pdf.cjs <input.html> <output.pdf>
 *
 * Cada slide se renderiza como una página independiente cuya altura se ajusta
 * a su contenido real (mínimo 810px), evitando cortes. Al final se fusionan
 * todas las páginas en un único PDF.
 *
 * Requiere `playwright-core` y `pdf-lib` en el proyecto. En este repo ya están
 * declaradas como devDependencies en la raíz, así que `pnpm install` alcanza.
 */

const path = require("path");
const fs = require("fs");

// --- Argumentos ---
const [, , inputArg, outputArg] = process.argv;

if (!inputArg || !outputArg) {
  console.error("Uso: node exportar-pdf.cjs <input.html> <output.pdf>");
  process.exit(1);
}

const htmlPath = path.resolve(inputArg);
const pdfPath = path.resolve(outputArg);

if (!fs.existsSync(htmlPath)) {
  console.error("No se encontró el archivo HTML: " + htmlPath);
  process.exit(1);
}

// --- Dependencias (con mensaje claro si faltan) ---
let chromium, PDFDocument;
try {
  ({ chromium } = require("playwright-core"));
  ({ PDFDocument } = require("pdf-lib"));
} catch (err) {
  console.error(
    "Faltan dependencias. Están declaradas en la raíz del repo, así que normalmente\n" +
      "basta con:\n" +
      "  pnpm install\n" +
      "Si de verdad no están declaradas, agrégalas con el gestor del proyecto:\n" +
      "  pnpm add -Dw playwright-core pdf-lib"
  );
  process.exit(1);
}

// --- Dimensiones del slide (landscape 16:9) ---
const W = 1440;
const MIN_H = 810;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: MIN_H } });

  await page.goto("file://" + htmlPath, { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "screen" });
  await page.waitForTimeout(1000);

  // Medir la altura real de cada slide dejándolos crecer con su contenido.
  const slideHeights = await page.evaluate(() => {
    const slides = document.querySelectorAll(".slide");
    slides.forEach((s) => {
      s.style.minHeight = "auto";
      s.style.height = "auto";
      s.style.overflow = "visible";
    });
    return Array.from(slides).map((s) => s.scrollHeight);
  });

  if (slideHeights.length === 0) {
    console.error("El HTML no contiene elementos .slide.");
    await browser.close();
    process.exit(1);
  }

  // Renderizar una página por slide, aislándolo del resto.
  const slidePdfs = [];
  for (let i = 0; i < slideHeights.length; i++) {
    const pageH = Math.max(MIN_H, slideHeights[i]);
    await page.evaluate(
      ({ idx, h }) => {
        document.querySelectorAll(".slide").forEach((s, j) => {
          if (j === idx) {
            s.style.display = "";
            s.style.height = h + "px";
            s.style.minHeight = h + "px";
            s.style.overflow = "visible";
          } else {
            s.style.display = "none";
          }
        });
      },
      { idx: i, h: pageH }
    );
    await page.waitForTimeout(300);

    const pdfBytes = await page.pdf({
      printBackground: true,
      preferCSSPageSize: false,
      width: W + "px",
      height: pageH + "px",
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    slidePdfs.push(pdfBytes);
  }

  // Fusionar todas las páginas en un único documento.
  const merged = await PDFDocument.create();
  for (const bytes of slidePdfs) {
    const doc = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  const mergedBytes = await merged.save();
  fs.writeFileSync(pdfPath, Buffer.from(mergedBytes));
  await browser.close();

  const nombre = path.basename(pdfPath);
  console.log(
    nombre +
      " — " +
      slideHeights.length +
      " slides, " +
      (mergedBytes.length / 1024 / 1024).toFixed(1) +
      " MB"
  );
})().catch((err) => {
  console.error("Error al generar el PDF:", err);
  process.exit(1);
});

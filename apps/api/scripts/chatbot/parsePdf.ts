import { readFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";

export type ParsedPdf = {
  text: string;
  pages: number;
};

export const parsePdf = async (filePath: string): Promise<ParsedPdf> => {
  let buffer: Buffer;
  try {
    buffer = await readFile(filePath);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`No se pudo leer el archivo PDF en ${filePath}: ${reason}`);
  }
  let parser: PDFParse | null = null;
  try {
    parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return {
      text: result.text,
      pages: result.total,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`No se pudo procesar el PDF en ${filePath}: ${reason}`);
  } finally {
    // pdf-parse 2.x requires destroy() to release pdfjs worker resources.
    // Swallow destroy errors so they cannot mask the original parse error.
    if (parser) await parser.destroy().catch(() => undefined);
  }
};

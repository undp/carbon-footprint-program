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
  try {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return {
      text: result.text,
      pages: result.total,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`No se pudo procesar el PDF en ${filePath}: ${reason}`);
  }
};

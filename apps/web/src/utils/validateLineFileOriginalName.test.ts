import { describe, expect, it } from "vitest";
import { validateLineFileOriginalName } from "./validateLineFileOriginalName";

// The validator maps each Zod failure to a private Spanish reason. Mirror the
// exact copy here so the assertions read as intent, not magic text; a copy
// change should force a deliberate update on both sides.
const REASON_EMPTY = "El nombre del archivo no puede estar vacío";
const REASON_TOO_LONG =
  "El nombre del archivo no puede superar los 255 caracteres";
const REASON_CONTROL =
  "El nombre del archivo no puede contener caracteres de control";
const REASON_SEPARATORS =
  "El nombre del archivo no puede contener barras ('/' o '\\')";
const REASON_INVALID = "Nombre de archivo no válido";

// Build a filename with a single control char embedded mid-string (so the
// leading/trailing `.trim()` cannot strip it). Constructed via char code to
// keep this source file free of literal control bytes.
const withControlChar = (code: number): string =>
  `archivo${String.fromCharCode(code)}.pdf`;

describe("validateLineFileOriginalName — valid names", () => {
  it.each([
    ["plain ascii filename", "documento.pdf"],
    ["hyphens and digits", "reporte-emisiones-2024.xlsx"],
    ["spaces inside the name", "informe anual 2024.docx"],
    ["accented unicode", "café con leche.txt"],
    ["ñ and tilde", "año año.csv"],
    ["cjk characters", "文件.pdf"],
    ["emoji in the name", "reporte 📊.pdf"],
    ["dot files", ".gitignore"],
    ["single character", "a"],
    ["exactly 255 characters", `${"a".repeat(251)}.pdf`],
  ])("accepts %s", (_label, name) => {
    expect(validateLineFileOriginalName(name)).toEqual({ ok: true });
  });

  it("accepts a name that is only valid after trimming surrounding whitespace", () => {
    // The schema `.trim()`s before validating, so padding is tolerated.
    expect(validateLineFileOriginalName("  documento.pdf  ")).toEqual({
      ok: true,
    });
  });
});

describe("validateLineFileOriginalName — empty (too_small)", () => {
  it.each([
    ["empty string", ""],
    ["spaces only", "   "],
    ["tabs and newlines only", "\t\n "],
  ])("rejects %s with the empty-name reason", (_label, name) => {
    expect(validateLineFileOriginalName(name)).toEqual({
      ok: false,
      reason: REASON_EMPTY,
    });
  });
});

describe("validateLineFileOriginalName — too long (too_big)", () => {
  it("rejects a name longer than 255 characters", () => {
    // 256 non-separator, non-control chars → only the max-length check fails.
    const name = `${"a".repeat(252)}.pdf`;
    expect(name).toHaveLength(256);
    expect(validateLineFileOriginalName(name)).toEqual({
      ok: false,
      reason: REASON_TOO_LONG,
    });
  });
});

describe("validateLineFileOriginalName — control characters", () => {
  it.each([
    ["null byte U+0000", 0x00],
    ["bell U+0007", 0x07],
    ["vertical tab U+000b", 0x0b],
    ["DEL U+007f", 0x7f],
  ])("rejects a name containing a %s", (_label, code) => {
    expect(validateLineFileOriginalName(withControlChar(code))).toEqual({
      ok: false,
      reason: REASON_CONTROL,
    });
  });
});

describe("validateLineFileOriginalName — path separators", () => {
  it.each([
    ["forward slash", "carpeta/archivo.pdf"],
    ["backslash", "carpeta\\archivo.pdf"],
    ["relative traversal", "../secretos.txt"],
    ["absolute-looking path", "/etc/passwd"],
  ])("rejects a name containing a %s", (_label, name) => {
    expect(validateLineFileOriginalName(name)).toEqual({
      ok: false,
      reason: REASON_SEPARATORS,
    });
  });
});

describe("validateLineFileOriginalName — defensive fallback", () => {
  it("returns the generic reason for a non-string runtime input", () => {
    // The signature is `string`, but the branch guards against untrusted
    // runtime data whose Zod failure is neither a length nor a refine issue
    // (here: invalid_type). Cast through `unknown` to reach that path.
    expect(validateLineFileOriginalName(123 as unknown as string)).toEqual({
      ok: false,
      reason: REASON_INVALID,
    });
  });
});

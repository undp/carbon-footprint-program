import { LineFileOriginalNameSchema } from "@repo/types";

export type LineFileNameValidation =
  { ok: true } | { ok: false; reason: string };

export const validateLineFileOriginalName = (
  name: string
): LineFileNameValidation => {
  const result = LineFileOriginalNameSchema.safeParse(name);
  if (result.success) return { ok: true };

  const issue = result.error.issues[0];
  const message = issue?.message ?? "";

  if (issue?.code === "too_small") {
    return {
      ok: false,
      reason: "El nombre del archivo no puede estar vacío",
    };
  }
  if (issue?.code === "too_big") {
    return {
      ok: false,
      reason: "El nombre del archivo no puede superar los 255 caracteres",
    };
  }
  if (message.includes("control characters")) {
    return {
      ok: false,
      reason: "El nombre del archivo no puede contener caracteres de control",
    };
  }
  if (message.includes("path separators")) {
    return {
      ok: false,
      reason: "El nombre del archivo no puede contener barras ('/' o '\\')",
    };
  }

  return { ok: false, reason: "Nombre de archivo no válido" };
};

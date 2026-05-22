import { z } from "zod";

export const FILENAME_MAX_LENGTH = 255;

export const FilenameSchema = z
  .string()
  .trim()
  .min(1, "El nombre del archivo es obligatorio")
  .max(FILENAME_MAX_LENGTH, `Máximo ${FILENAME_MAX_LENGTH} caracteres`)
  .regex(
    /^[ -~]+$/,
    "El nombre solo puede contener caracteres ASCII imprimibles"
  )
  .refine(
    (name) => !/[/\\:]/.test(name),
    "El nombre no puede contener separadores de ruta ni dos puntos"
  )
  .refine((name) => !/^\.+$/.test(name), "El nombre no puede ser solo puntos")
  .refine(
    (name) => !/[.\s]$/.test(name),
    "El nombre no puede terminar en punto o espacio"
  );

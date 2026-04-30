import { Magnitude } from "@repo/types";

// TODO: we should handle this magnitudes in a database table
export const MAGNITUDE_LABELS: Record<Magnitude, string> = {
  [Magnitude.MASS]: "Masa",
  [Magnitude.VOLUME]: "Volumen",
  [Magnitude.DISTANCE]: "Distancia",
  [Magnitude.TIME]: "Tiempo",
  [Magnitude.ANIMALS]: "Animales",
  [Magnitude.AREA]: "Área",
  [Magnitude.POWER]: "Potencia",
  [Magnitude.ENERGY]: "Energía",
  [Magnitude.DISTANCE_MASS]: "Distancia · Masa",
  [Magnitude.ROOMS]: "Habitaciones",
};

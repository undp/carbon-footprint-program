export { kgToTon, tonToKg } from "@repo/utils";

export const toNullableNumber = (value: unknown): number | null => {
  if (value === "" || value == null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

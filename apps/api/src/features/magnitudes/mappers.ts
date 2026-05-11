import type { Magnitude } from "@repo/database";
import type { MagnitudeBase } from "@repo/types";

export const mapMagnitudeToBase = (magnitude: Magnitude): MagnitudeBase => ({
  id: magnitude.id.toString(),
  code: magnitude.code,
  name: magnitude.name,
  isSystem: magnitude.isSystem,
  status: magnitude.status,
});

export const mapMagnitudeWithReferenceCount = (
  magnitude: Magnitude,
  referenceCount: number
) => ({
  ...mapMagnitudeToBase(magnitude),
  referenceCount,
});

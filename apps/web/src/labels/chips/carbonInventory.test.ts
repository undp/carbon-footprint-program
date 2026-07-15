import { describe, expect, it } from "vitest";
import {
  CarbonInventoryDisplayStatusEnum,
  type CarbonInventoryDisplayStatus,
} from "@repo/types";
import { StatusFamily } from "./types";
import { CARBON_INVENTORY_STATUS_CONFIG } from "./carbonInventory";

describe("CARBON_INVENTORY_STATUS_CONFIG", () => {
  it("has an entry for every CarbonInventoryDisplayStatus value", () => {
    // The highest-value guard: a new display status added to the enum without a
    // chip mapping would fail here (the chip would otherwise render blank).
    expect(Object.keys(CARBON_INVENTORY_STATUS_CONFIG).sort()).toEqual(
      Object.values(CarbonInventoryDisplayStatusEnum).sort()
    );
  });

  it.each<[CarbonInventoryDisplayStatus, StatusFamily]>([
    [CarbonInventoryDisplayStatusEnum.DRAFT, StatusFamily.NEUTRAL],
    [CarbonInventoryDisplayStatusEnum.SELF_DECLARED, StatusFamily.NEUTRAL],
    [
      CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_CALCULATION,
      StatusFamily.IN_REVIEW,
    ],
    [
      CarbonInventoryDisplayStatusEnum.CALCULATION_REVIEWED,
      StatusFamily.ACTION_REQUIRED,
    ],
    [
      CarbonInventoryDisplayStatusEnum.CALCULATION_REJECTED,
      StatusFamily.NEGATIVE,
    ],
    [
      CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED,
      StatusFamily.POSITIVE,
    ],
    [
      CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_VERIFICATION,
      StatusFamily.IN_REVIEW,
    ],
    [
      CarbonInventoryDisplayStatusEnum.VERIFICATION_REVIEWED,
      StatusFamily.ACTION_REQUIRED,
    ],
    [
      CarbonInventoryDisplayStatusEnum.VERIFICATION_REJECTED,
      StatusFamily.NEGATIVE,
    ],
    [
      CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED,
      StatusFamily.POSITIVE,
    ],
    [CarbonInventoryDisplayStatusEnum.DELETED, StatusFamily.NEUTRAL],
  ])("assigns family for %s", (status, family) => {
    expect(CARBON_INVENTORY_STATUS_CONFIG[status].family).toBe(family);
  });

  it.each<[CarbonInventoryDisplayStatus, string, string]>([
    [CarbonInventoryDisplayStatusEnum.DRAFT, "Borrador", "En Borrador"],
    [
      CarbonInventoryDisplayStatusEnum.SELF_DECLARED,
      "Autodeclarada",
      "Huella autodeclarada",
    ],
    [
      CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_CALCULATION,
      "En revisión",
      "En revisión - Reconocimiento de medición",
    ],
    [
      CarbonInventoryDisplayStatusEnum.CALCULATION_REVIEWED,
      "Con observaciones",
      "Con observaciones - Reconocimiento de medición",
    ],
    [
      CarbonInventoryDisplayStatusEnum.CALCULATION_REJECTED,
      "Rechazado",
      "Rechazado - Reconocimiento de medición",
    ],
    [
      CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED,
      "Aprobado",
      "Aprobado - Reconocimiento de medición",
    ],
    [
      CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_VERIFICATION,
      "En revisión",
      "En revisión - Reconocimiento de verificación",
    ],
    [
      CarbonInventoryDisplayStatusEnum.VERIFICATION_REVIEWED,
      "Con observaciones",
      "Con observaciones - Reconocimiento de verificación",
    ],
    [
      CarbonInventoryDisplayStatusEnum.VERIFICATION_REJECTED,
      "Rechazado",
      "Rechazado - Reconocimiento de verificación",
    ],
    [
      CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED,
      "Aprobado",
      "Aprobado - Reconocimiento de verificación",
    ],
    [CarbonInventoryDisplayStatusEnum.DELETED, "Eliminado", "Huella eliminada"],
  ])(
    "uses the exact Spanish label and tooltip for %s",
    (status, label, tooltip) => {
      // Every label/tooltip in this config is a plain string literal (no VOCAB
      // interpolation), so exact-match assertions are appropriate.
      expect(CARBON_INVENTORY_STATUS_CONFIG[status].label).toBe(label);
      expect(CARBON_INVENTORY_STATUS_CONFIG[status].tooltip).toBe(tooltip);
    }
  );

  it("does not assign sortOrder (this config is not grid-sorted)", () => {
    for (const status of Object.values(CarbonInventoryDisplayStatusEnum)) {
      expect(CARBON_INVENTORY_STATUS_CONFIG[status].sortOrder).toBeUndefined();
    }
  });
});

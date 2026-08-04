import { describe, expect, it } from "vitest";
import { capitalize } from "lodash-es";
import {
  OrganizationDisplayStatusValues,
  type OrganizationDisplayStatus,
} from "@repo/types";
import { VOCAB } from "@/config/vocab";
import { StatusFamily } from "./types";
import {
  AdminOrganizationDisplayStatus,
  ADMIN_ORGANIZATION_STATUS_CONFIG,
  ADMIN_ORGANIZATION_STATUS_SORT_ORDER,
  ORGANIZATION_DISPLAY_STATUS_CONFIG,
} from "./organization";

// Labels/tooltips that interpolate VOCAB are reconstructed from the same
// vocabulary the source reads, so the assertions track config changes rather
// than freezing a per-deployment Spanish string.
const inscribed = capitalize(VOCAB.inscription.adjective.singular);
const organizationNoun = capitalize(VOCAB.organization.noun.singular);

describe("ADMIN_ORGANIZATION_STATUS_CONFIG", () => {
  it("has an entry for every AdminOrganizationDisplayStatus member", () => {
    // Guards against an enum value gaining no chip mapping (blank chip).
    expect(Object.keys(ADMIN_ORGANIZATION_STATUS_CONFIG).sort()).toEqual(
      Object.values(AdminOrganizationDisplayStatus).sort()
    );
  });

  it.each<[AdminOrganizationDisplayStatus, StatusFamily]>([
    [AdminOrganizationDisplayStatus.WITH_MEASUREMENTS, StatusFamily.POSITIVE],
    [AdminOrganizationDisplayStatus.ACCREDITED, StatusFamily.POSITIVE],
    [AdminOrganizationDisplayStatus.NOT_ACCREDITED, StatusFamily.NEUTRAL],
    [AdminOrganizationDisplayStatus.BLOCKED, StatusFamily.NEGATIVE],
  ])("assigns family for %s", (status, family) => {
    expect(ADMIN_ORGANIZATION_STATUS_CONFIG[status].family).toBe(family);
  });

  it("uses the exact plain-literal labels", () => {
    expect(
      ADMIN_ORGANIZATION_STATUS_CONFIG[
        AdminOrganizationDisplayStatus.WITH_MEASUREMENTS
      ].label
    ).toBe("con Mediciones");
    expect(
      ADMIN_ORGANIZATION_STATUS_CONFIG[AdminOrganizationDisplayStatus.BLOCKED]
        .label
    ).toBe("Bloqueada");
  });

  it("builds the VOCAB-interpolated labels from the current vocabulary", () => {
    expect(
      ADMIN_ORGANIZATION_STATUS_CONFIG[
        AdminOrganizationDisplayStatus.ACCREDITED
      ].label
    ).toBe(inscribed);
    expect(
      ADMIN_ORGANIZATION_STATUS_CONFIG[
        AdminOrganizationDisplayStatus.NOT_ACCREDITED
      ].label
    ).toBe(`No ${inscribed}`);
  });

  it.each<[AdminOrganizationDisplayStatus, string]>([
    [
      AdminOrganizationDisplayStatus.WITH_MEASUREMENTS,
      `${organizationNoun} ${VOCAB.inscription.adjective.singular} con mediciones de huella registradas`,
    ],
    [
      AdminOrganizationDisplayStatus.ACCREDITED,
      `${organizationNoun} ${VOCAB.inscription.adjective.singular} sin mediciones registradas`,
    ],
    [
      AdminOrganizationDisplayStatus.NOT_ACCREDITED,
      `${organizationNoun} sin proceso de ${VOCAB.inscription.noun.singular}`,
    ],
    [AdminOrganizationDisplayStatus.BLOCKED, `${organizationNoun} bloqueada`],
  ])("reconstructs the interpolated tooltip for %s", (status, tooltip) => {
    expect(ADMIN_ORGANIZATION_STATUS_CONFIG[status].tooltip).toBe(tooltip);
  });

  it.each(Object.values(AdminOrganizationDisplayStatus))(
    "has a non-empty label and tooltip for %s",
    (status) => {
      const config = ADMIN_ORGANIZATION_STATUS_CONFIG[status];
      expect(config.label.length).toBeGreaterThan(0);
      expect(config.tooltip.length).toBeGreaterThan(0);
    }
  );

  it("assigns unique sortOrder values contiguous from 0", () => {
    const orders = Object.values(ADMIN_ORGANIZATION_STATUS_CONFIG).map(
      (config) => config.sortOrder
    );
    expect(new Set(orders).size).toBe(orders.length);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders.map((_, i) => i));
  });
});

describe("ADMIN_ORGANIZATION_STATUS_SORT_ORDER", () => {
  it("maps each key to its config sortOrder", () => {
    expect(Object.keys(ADMIN_ORGANIZATION_STATUS_SORT_ORDER).sort()).toEqual(
      Object.keys(ADMIN_ORGANIZATION_STATUS_CONFIG).sort()
    );
    for (const status of Object.values(AdminOrganizationDisplayStatus)) {
      expect(ADMIN_ORGANIZATION_STATUS_SORT_ORDER[status]).toBe(
        ADMIN_ORGANIZATION_STATUS_CONFIG[status].sortOrder
      );
    }
  });
});

describe("ORGANIZATION_DISPLAY_STATUS_CONFIG", () => {
  it("has an entry for every OrganizationDisplayStatus value", () => {
    expect(Object.keys(ORGANIZATION_DISPLAY_STATUS_CONFIG).sort()).toEqual(
      Object.values(OrganizationDisplayStatusValues).sort()
    );
  });

  it.each<[OrganizationDisplayStatus, StatusFamily]>([
    [OrganizationDisplayStatusValues.ACCREDITED, StatusFamily.POSITIVE],
    [OrganizationDisplayStatusValues.NOT_ACCREDITED, StatusFamily.NEUTRAL],
    [OrganizationDisplayStatusValues.BLOCKED, StatusFamily.NEGATIVE],
  ])("assigns family for %s", (status, family) => {
    expect(ORGANIZATION_DISPLAY_STATUS_CONFIG[status].family).toBe(family);
  });

  it("uses the exact plain-literal label for BLOCKED", () => {
    expect(
      ORGANIZATION_DISPLAY_STATUS_CONFIG[
        OrganizationDisplayStatusValues.BLOCKED
      ].label
    ).toBe("Bloqueada");
  });

  it("builds the VOCAB-interpolated labels from the current vocabulary", () => {
    expect(
      ORGANIZATION_DISPLAY_STATUS_CONFIG[
        OrganizationDisplayStatusValues.ACCREDITED
      ].label
    ).toBe(inscribed);
    expect(
      ORGANIZATION_DISPLAY_STATUS_CONFIG[
        OrganizationDisplayStatusValues.NOT_ACCREDITED
      ].label
    ).toBe(`No ${inscribed}`);
  });

  it.each<[OrganizationDisplayStatus, string]>([
    [
      OrganizationDisplayStatusValues.ACCREDITED,
      `${organizationNoun} ${VOCAB.inscription.adjective.singular}`,
    ],
    [
      OrganizationDisplayStatusValues.NOT_ACCREDITED,
      `${organizationNoun} sin proceso de ${VOCAB.inscription.noun.singular}`,
    ],
    [OrganizationDisplayStatusValues.BLOCKED, `${organizationNoun} bloqueada`],
  ])("reconstructs the interpolated tooltip for %s", (status, tooltip) => {
    expect(ORGANIZATION_DISPLAY_STATUS_CONFIG[status].tooltip).toBe(tooltip);
  });

  it.each(Object.values(OrganizationDisplayStatusValues))(
    "has a non-empty label and tooltip for %s",
    (status) => {
      const config = ORGANIZATION_DISPLAY_STATUS_CONFIG[status];
      expect(config.label.length).toBeGreaterThan(0);
      expect(config.tooltip.length).toBeGreaterThan(0);
    }
  );

  it("does not assign sortOrder (this config is not grid-sorted)", () => {
    for (const status of Object.values(OrganizationDisplayStatusValues)) {
      expect(
        ORGANIZATION_DISPLAY_STATUS_CONFIG[status].sortOrder
      ).toBeUndefined();
    }
  });
});

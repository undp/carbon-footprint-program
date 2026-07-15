import { describe, expect, it } from "vitest";
import { SubmissionEventType, SubmissionType } from "@repo/types";
import type { SubmissionHistoryEntry } from "@repo/types";
import {
  EVENT_TYPE_LABEL,
  getEventLabel,
  getPostulationLabel,
  getReviewTitle,
} from "./submissions";

describe("EVENT_TYPE_LABEL", () => {
  it.each<[SubmissionEventType, string]>([
    [SubmissionEventType.POSTULATION, "POSTULACIÓN"],
    [SubmissionEventType.SELF_DECLARATION, "AUTODECLARADA"],
    [SubmissionEventType.ON_REVIEW, "EN REVISIÓN"],
    [SubmissionEventType.APPROVED, "APROBADA"],
    [SubmissionEventType.APPROVED_AUTOMATICALLY, "OTORGADO"],
    [SubmissionEventType.REJECTED, "RECHAZADA"],
    [SubmissionEventType.REVIEWED, "CON OBSERVACIONES"],
  ])("maps %s to its Spanish label", (eventType, label) => {
    expect(EVENT_TYPE_LABEL[eventType]).toBe(label);
  });

  it("has a label for every SubmissionEventType value", () => {
    expect(Object.keys(EVENT_TYPE_LABEL).sort()).toEqual(
      Object.values(SubmissionEventType).sort()
    );
  });
});

describe("getPostulationLabel", () => {
  it.each<[SubmissionType, string]>([
    [
      SubmissionType.CARBON_INVENTORY_VERIFICATION,
      "POSTULACIÓN A RECONOCIMIENTO DE VERIFICACIÓN",
    ],
    [
      SubmissionType.CARBON_INVENTORY_CALCULATION,
      "POSTULACIÓN A RECONOCIMIENTO DE MEDICIÓN",
    ],
    [
      SubmissionType.ORGANIZATION_ACCREDITATION,
      "POSTULACIÓN A INSCRIPCIÓN ORGANIZACIÓN",
    ],
    [
      SubmissionType.REDUCTION_PROJECT_VERIFICATION,
      "POSTULACIÓN A RECONOCIMIENTO DE REDUCCIÓN",
    ],
    [
      SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION,
      "POSTULACIÓN A RECONOCIMIENTO DE NEUTRALIZACIÓN",
    ],
  ])("labels %s without the automatic prefix", (type, expected) => {
    expect(getPostulationLabel(type)).toBe(expected);
    // Default (automatic = false) must match the explicit `false` argument.
    expect(getPostulationLabel(type, false)).toBe(expected);
  });

  it.each<[SubmissionType, string]>([
    [
      SubmissionType.CARBON_INVENTORY_VERIFICATION,
      "POSTULACIÓN AUTOMÁTICA A RECONOCIMIENTO DE VERIFICACIÓN",
    ],
    [
      SubmissionType.CARBON_INVENTORY_CALCULATION,
      "POSTULACIÓN AUTOMÁTICA A RECONOCIMIENTO DE MEDICIÓN",
    ],
    [
      SubmissionType.ORGANIZATION_ACCREDITATION,
      "POSTULACIÓN AUTOMÁTICA A INSCRIPCIÓN ORGANIZACIÓN",
    ],
    [
      SubmissionType.REDUCTION_PROJECT_VERIFICATION,
      "POSTULACIÓN AUTOMÁTICA A RECONOCIMIENTO DE REDUCCIÓN",
    ],
    [
      SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION,
      "POSTULACIÓN AUTOMÁTICA A RECONOCIMIENTO DE NEUTRALIZACIÓN",
    ],
  ])(
    "labels %s with the automatic prefix when automatic=true",
    (type, expected) => {
      expect(getPostulationLabel(type, true)).toBe(expected);
    }
  );

  it("returns just the prefix for an unknown submission type (default branch)", () => {
    const unknownType = "SOMETHING_ELSE" as unknown as SubmissionType;
    expect(getPostulationLabel(unknownType)).toBe("POSTULACIÓN");
    expect(getPostulationLabel(unknownType, true)).toBe(
      "POSTULACIÓN AUTOMÁTICA"
    );
  });
});

describe("getEventLabel", () => {
  // A realistic, fully-populated history entry; each case overrides `eventType`.
  const baseEntry: SubmissionHistoryEntry = {
    submissionId: "1",
    submissionType: SubmissionType.CARBON_INVENTORY_CALCULATION,
    eventType: SubmissionEventType.POSTULATION,
    status: null,
    date: "2026-01-01T00:00:00.000Z",
    userName: "Ana",
    userMetadata: null,
    carbonInventoryId: null,
    carbonInventoryYear: null,
    organizationId: "1",
    organizationData: null,
    comment: "",
    files: [],
    recognitions: [],
  };

  it.each<[SubmissionEventType, string]>([
    [SubmissionEventType.POSTULATION, "POSTULACIÓN"],
    [SubmissionEventType.SELF_DECLARATION, "AUTODECLARADA"],
    [SubmissionEventType.ON_REVIEW, "EN REVISIÓN"],
    [SubmissionEventType.APPROVED, "APROBADA"],
    [SubmissionEventType.APPROVED_AUTOMATICALLY, "OTORGADO"],
    [SubmissionEventType.REJECTED, "RECHAZADA"],
    [SubmissionEventType.REVIEWED, "CON OBSERVACIONES"],
  ])("returns the mapped label for %s", (eventType, label) => {
    expect(getEventLabel({ ...baseEntry, eventType })).toBe(label);
  });

  it("falls back to the raw eventType when it is not in the label map", () => {
    const entry: SubmissionHistoryEntry = {
      ...baseEntry,
      eventType: "UNMAPPED" as unknown as SubmissionEventType,
    };
    expect(getEventLabel(entry)).toBe("UNMAPPED");
  });
});

describe("getReviewTitle", () => {
  it("returns 'Solicitud' when no type is given", () => {
    expect(getReviewTitle()).toBe("Solicitud");
    expect(getReviewTitle(undefined)).toBe("Solicitud");
  });

  it.each<[SubmissionType, string]>([
    [
      SubmissionType.ORGANIZATION_ACCREDITATION,
      "Revisión de la postulación a Inscripción de organización",
    ],
    [
      SubmissionType.CARBON_INVENTORY_CALCULATION,
      "Revisión de la postulación al Reconocimiento de medición",
    ],
    [
      SubmissionType.CARBON_INVENTORY_VERIFICATION,
      "Revisión de la postulación al Reconocimiento de verificación",
    ],
    [
      SubmissionType.REDUCTION_PROJECT_VERIFICATION,
      "Revisión de la postulación al Reconocimiento de reducción",
    ],
    [
      SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION,
      "Revisión de la postulación al Reconocimiento de neutralización",
    ],
  ])("builds the review title for %s", (type, expected) => {
    expect(getReviewTitle(type)).toBe(expected);
  });

  it("trims to the bare prefix for a type missing from the map", () => {
    const unknownType = "OTHER" as unknown as SubmissionType;
    expect(getReviewTitle(unknownType)).toBe("Revisión de la postulación");
  });
});

import { describe, expect, it } from "vitest";
import { SubmissionStatus } from "@repo/types";
import { StatusFamily } from "./types";
import {
  SUBMISSION_STATUS_CONFIG,
  SUBMISSION_STATUS_SORT_ORDER,
} from "./submission";

// [status, family, label, tooltip, sortOrder] — labels/tooltips are plain
// Spanish string literals in the source, so assert them verbatim.
const CASES: [SubmissionStatus, StatusFamily, string, string, number][] = [
  [
    SubmissionStatus.PENDING,
    StatusFamily.IN_REVIEW,
    "Pendiente",
    "Solicitud pendiente de revisión",
    0,
  ],
  [
    SubmissionStatus.REVIEWED,
    StatusFamily.ACTION_REQUIRED,
    "Con Observaciones",
    "Solicitud devuelta con observaciones",
    1,
  ],
  [
    SubmissionStatus.APPROVED,
    StatusFamily.POSITIVE,
    "Aprobada",
    "Solicitud aprobada",
    2,
  ],
  [
    SubmissionStatus.APPROVED_AUTOMATICALLY,
    StatusFamily.POSITIVE,
    "Otorgado",
    "Reconocimiento otorgado automáticamente",
    3,
  ],
  [
    SubmissionStatus.REJECTED,
    StatusFamily.NEGATIVE,
    "Rechazada",
    "Solicitud rechazada",
    4,
  ],
];

describe("SUBMISSION_STATUS_CONFIG", () => {
  it("has an entry for every SubmissionStatus value", () => {
    expect(Object.keys(SUBMISSION_STATUS_CONFIG).sort()).toEqual(
      Object.values(SubmissionStatus).sort()
    );
  });

  it.each(CASES)(
    "maps %s to its family, label, tooltip and sortOrder",
    (status, family, label, tooltip, sortOrder) => {
      const entry = SUBMISSION_STATUS_CONFIG[status];
      expect(entry.family).toBe(family);
      expect(entry.label).toBe(label);
      expect(entry.tooltip).toBe(tooltip);
      expect(entry.sortOrder).toBe(sortOrder);
    }
  );

  it("uses a StatusFamily enum value for every family", () => {
    const families = Object.values(StatusFamily);
    for (const entry of Object.values(SUBMISSION_STATUS_CONFIG)) {
      expect(families).toContain(entry.family);
    }
  });

  it("assigns unique sortOrders that are contiguous from 0", () => {
    const orders = Object.values(SUBMISSION_STATUS_CONFIG).map(
      (entry) => entry.sortOrder
    );
    expect(new Set(orders).size).toBe(orders.length);
    expect([...orders].sort((a, b) => a - b)).toEqual(
      orders.map((_, index) => index)
    );
  });
});

describe("SUBMISSION_STATUS_SORT_ORDER", () => {
  it("covers exactly the same keys as the config", () => {
    expect(Object.keys(SUBMISSION_STATUS_SORT_ORDER).sort()).toEqual(
      Object.keys(SUBMISSION_STATUS_CONFIG).sort()
    );
  });

  it.each(CASES)("maps %s to its config sortOrder", (status) => {
    expect(SUBMISSION_STATUS_SORT_ORDER[status]).toBe(
      SUBMISSION_STATUS_CONFIG[status].sortOrder
    );
  });
});

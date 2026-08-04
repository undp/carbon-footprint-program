import { describe, expect, it } from "vitest";
import {
  CountryOrganizationSizeStatus,
  CountrySectorStatus,
  CountrySubsectorStatus,
  OrganizationMainActivityStatus,
} from "@repo/types";
import { StatusFamily } from "./types";
import type { ProfilingDomainStatus } from "./profiling";
import {
  PROFILING_STATUS_CONFIG,
  ProfilingStatusKey,
  resolveProfilingStatusKey,
} from "./profiling";

// [key, family, label, tooltip] — labels/tooltips are plain Spanish string
// literals in the source, so assert them verbatim. Profiling chips are not
// grid-sorted, so no entry carries a sortOrder.
const CASES: [ProfilingStatusKey, StatusFamily, string, string][] = [
  [
    ProfilingStatusKey.ACTIVE,
    StatusFamily.POSITIVE,
    "Activo",
    "Registro activo y disponible",
  ],
  [
    ProfilingStatusKey.DELETED,
    StatusFamily.NEUTRAL,
    "Eliminado",
    "Registro eliminado",
  ],
  [
    ProfilingStatusKey.NEW,
    StatusFamily.IN_REVIEW,
    "Nuevo",
    "Registro nuevo (sin guardar)",
  ],
];

describe("PROFILING_STATUS_CONFIG", () => {
  it("has an entry for every ProfilingStatusKey value", () => {
    expect(Object.keys(PROFILING_STATUS_CONFIG).sort()).toEqual(
      Object.values(ProfilingStatusKey).sort()
    );
  });

  it.each(CASES)(
    "maps %s to its family, label and tooltip",
    (key, family, label, tooltip) => {
      const entry = PROFILING_STATUS_CONFIG[key];
      expect(entry.family).toBe(family);
      expect(entry.label).toBe(label);
      expect(entry.tooltip).toBe(tooltip);
    }
  );

  it("uses a StatusFamily enum value for every family", () => {
    const families = Object.values(StatusFamily);
    for (const entry of Object.values(PROFILING_STATUS_CONFIG)) {
      expect(families).toContain(entry.family);
    }
  });

  it("does not assign a sortOrder (profiling chips are not grid-sorted)", () => {
    for (const entry of Object.values(PROFILING_STATUS_CONFIG)) {
      expect(entry.sortOrder).toBeUndefined();
    }
  });
});

describe("resolveProfilingStatusKey", () => {
  // Every profiling-domain enum shares the same ACTIVE/DELETED value set;
  // assert each concrete member resolves so a diverging enum is caught.
  const RESOLVE_CASES: [string, ProfilingDomainStatus, ProfilingStatusKey][] = [
    [
      "CountrySectorStatus.ACTIVE",
      CountrySectorStatus.ACTIVE,
      ProfilingStatusKey.ACTIVE,
    ],
    [
      "CountrySectorStatus.DELETED",
      CountrySectorStatus.DELETED,
      ProfilingStatusKey.DELETED,
    ],
    [
      "CountrySubsectorStatus.ACTIVE",
      CountrySubsectorStatus.ACTIVE,
      ProfilingStatusKey.ACTIVE,
    ],
    [
      "CountrySubsectorStatus.DELETED",
      CountrySubsectorStatus.DELETED,
      ProfilingStatusKey.DELETED,
    ],
    [
      "OrganizationMainActivityStatus.ACTIVE",
      OrganizationMainActivityStatus.ACTIVE,
      ProfilingStatusKey.ACTIVE,
    ],
    [
      "OrganizationMainActivityStatus.DELETED",
      OrganizationMainActivityStatus.DELETED,
      ProfilingStatusKey.DELETED,
    ],
    [
      "CountryOrganizationSizeStatus.ACTIVE",
      CountryOrganizationSizeStatus.ACTIVE,
      ProfilingStatusKey.ACTIVE,
    ],
    [
      "CountryOrganizationSizeStatus.DELETED",
      CountryOrganizationSizeStatus.DELETED,
      ProfilingStatusKey.DELETED,
    ],
  ];

  it.each(RESOLVE_CASES)(
    "resolves %s to the matching profiling key",
    (_name, status, expected) => {
      expect(resolveProfilingStatusKey(status)).toBe(expected);
    }
  );

  it("falls back to NEW for a null status (new/unsaved row)", () => {
    expect(resolveProfilingStatusKey(null)).toBe(ProfilingStatusKey.NEW);
  });

  it("falls back to NEW for an undefined status", () => {
    expect(resolveProfilingStatusKey(undefined)).toBe(ProfilingStatusKey.NEW);
  });

  it("only ever returns keys that exist in the config", () => {
    const resolved = [
      resolveProfilingStatusKey(CountrySectorStatus.ACTIVE),
      resolveProfilingStatusKey(CountrySectorStatus.DELETED),
      resolveProfilingStatusKey(null),
    ];
    for (const key of resolved) {
      expect(PROFILING_STATUS_CONFIG[key]).toBeDefined();
    }
  });
});

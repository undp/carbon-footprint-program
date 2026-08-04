import { describe, expect, it } from "vitest";
import { OrganizationRole, SystemRole } from "@repo/types";
import { ORGANIZATION_ROLE_LABELS, SYSTEM_ROLE_LABELS } from "./role";

// [role, label, tooltip] — plain Spanish string literals.
const SYSTEM_CASES: [SystemRole, string, string][] = [
  [SystemRole.USER, "Usuario", "Usuario estándar sin permisos administrativos"],
  [SystemRole.ADMIN, "Admin", "Administrador con acceso al panel admin"],
  [
    SystemRole.SUPERADMIN,
    "Superadmin",
    "Super administrador con permisos completos",
  ],
];

// [role, label] — ORGANIZATION_ROLE_LABELS maps directly to a plain string.
const ORGANIZATION_CASES: [OrganizationRole, string][] = [
  [OrganizationRole.ADMIN, "Administrador"],
  [OrganizationRole.CONTRIBUTOR, "Colaborador"],
  [OrganizationRole.VIEWER, "Lector"],
];

describe("SYSTEM_ROLE_LABELS", () => {
  it("has an entry for every SystemRole value", () => {
    expect(Object.keys(SYSTEM_ROLE_LABELS).sort()).toEqual(
      Object.values(SystemRole).sort()
    );
  });

  it.each(SYSTEM_CASES)(
    "maps %s to its label and tooltip",
    (role, label, tooltip) => {
      const entry = SYSTEM_ROLE_LABELS[role];
      expect(entry.label).toBe(label);
      expect(entry.tooltip).toBe(tooltip);
    }
  );
});

describe("ORGANIZATION_ROLE_LABELS", () => {
  it("has an entry for every OrganizationRole value", () => {
    expect(Object.keys(ORGANIZATION_ROLE_LABELS).sort()).toEqual(
      Object.values(OrganizationRole).sort()
    );
  });

  it.each(ORGANIZATION_CASES)("maps %s to its label", (role, label) => {
    expect(ORGANIZATION_ROLE_LABELS[role]).toBe(label);
  });
});

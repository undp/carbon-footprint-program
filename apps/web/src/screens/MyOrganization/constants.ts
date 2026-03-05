import { OrganizationRole } from "./types";

export const ROLE_LABELS: Record<OrganizationRole, string> = {
  VIEWER: "Lector",
  ORGANIZATION_CONTRIBUTOR: "Editor",
  ORGANIZATION_ADMIN: "Admin",
  EXTERNAL_VERIFIER: "Verificador Externo",
  EXTERNAL_CONSULTANT: "Consultor Externo",
};

export const ROLE_OPTIONS = (
  Object.entries(ROLE_LABELS) as [OrganizationRole, string][]
).map(([value, label]) => ({ label, value }));

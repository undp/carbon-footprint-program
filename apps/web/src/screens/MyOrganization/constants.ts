export const ROLE_LABELS: Record<string, string> = {
  VIEWER: "Lector",
  ORGANIZATION_CONTRIBUTOR: "Editor",
  ORGANIZATION_ADMIN: "Admin",
  EXTERNAL_VERIFIER: "Verificador Externo",
  EXTERNAL_CONSULTANT: "Consultor Externo",
};

export const ROLE_OPTIONS = [
  { label: "Lector", value: "VIEWER" },
  { label: "Editor", value: "ORGANIZATION_CONTRIBUTOR" },
  { label: "Admin", value: "ORGANIZATION_ADMIN" },
  { label: "Verificador Externo", value: "EXTERNAL_VERIFIER" },
  { label: "Consultor Externo", value: "EXTERNAL_CONSULTANT" },
];

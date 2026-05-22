import { OrganizationRole } from "@repo/types";
import { ORGANIZATION_ROLE_LABELS } from "@/labels/status/role";

export const ROLE_OPTIONS = (
  Object.entries(ORGANIZATION_ROLE_LABELS) as [OrganizationRole, string][]
).map(([value, label]) => ({ label, value }));

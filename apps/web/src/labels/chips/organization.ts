import { capitalize } from "lodash-es";
import {
  OrganizationDisplayStatus,
  OrganizationDisplayStatusValues,
} from "@repo/types";
import { VOCAB } from "@/config/vocab";
import { StatusConfig, StatusFamily } from "./types";
import { sortOrderByKey } from "@/utils/dataGrid";

/**
 * Display-only status for the admin organizations table: refines the
 * persisted OrganizationStatus with accreditation/measurement context.
 * Derived per row by `getDisplayStatus` (screens/Maintainer/utils).
 */
export enum AdminOrganizationDisplayStatus {
  WITH_MEASUREMENTS = "WITH_MEASUREMENTS",
  ACCREDITED = "ACCREDITED",
  NOT_ACCREDITED = "NOT_ACCREDITED",
  BLOCKED = "BLOCKED",
}

export const ADMIN_ORGANIZATION_STATUS_CONFIG = {
  [AdminOrganizationDisplayStatus.WITH_MEASUREMENTS]: {
    family: StatusFamily.POSITIVE,
    label: "con Mediciones",
    tooltip: `${capitalize(VOCAB.organization.noun.singular)} ${VOCAB.inscription.adjective.singular} con mediciones de huella registradas`,
    sortOrder: 0,
  },
  [AdminOrganizationDisplayStatus.ACCREDITED]: {
    family: StatusFamily.POSITIVE,
    label: capitalize(VOCAB.inscription.adjective.singular),
    tooltip: `${capitalize(VOCAB.organization.noun.singular)} ${VOCAB.inscription.adjective.singular} sin mediciones registradas`,
    sortOrder: 1,
  },
  [AdminOrganizationDisplayStatus.NOT_ACCREDITED]: {
    family: StatusFamily.NEUTRAL,
    label: `No ${capitalize(VOCAB.inscription.adjective.singular)}`,
    tooltip: `${capitalize(VOCAB.organization.noun.singular)} sin proceso de ${VOCAB.inscription.noun.singular}`,
    sortOrder: 2,
  },
  [AdminOrganizationDisplayStatus.BLOCKED]: {
    family: StatusFamily.NEGATIVE,
    label: "Bloqueada",
    tooltip: `${capitalize(VOCAB.organization.noun.singular)} bloqueada`,
    sortOrder: 3,
  },
} satisfies Record<AdminOrganizationDisplayStatus, StatusConfig>;

export const ADMIN_ORGANIZATION_STATUS_SORT_ORDER = sortOrderByKey(
  ADMIN_ORGANIZATION_STATUS_CONFIG
);

export const ORGANIZATION_DISPLAY_STATUS_CONFIG: Record<
  OrganizationDisplayStatus,
  StatusConfig
> = {
  [OrganizationDisplayStatusValues.ACCREDITED]: {
    family: StatusFamily.POSITIVE,
    label: capitalize(VOCAB.inscription.adjective.singular),
    tooltip: `${capitalize(VOCAB.organization.noun.singular)} ${VOCAB.inscription.adjective.singular}`,
  },
  [OrganizationDisplayStatusValues.NOT_ACCREDITED]: {
    family: StatusFamily.NEUTRAL,
    label: `No ${capitalize(VOCAB.inscription.adjective.singular)}`,
    tooltip: `${capitalize(VOCAB.organization.noun.singular)} sin proceso de ${VOCAB.inscription.noun.singular}`,
  },
  [OrganizationDisplayStatusValues.BLOCKED]: {
    family: StatusFamily.NEGATIVE,
    label: "Bloqueada",
    tooltip: `${capitalize(VOCAB.organization.noun.singular)} bloqueada`,
  },
};

import { capitalize } from "lodash-es";
import {
  OrganizationDisplayStatus,
  OrganizationDisplayStatusValues,
} from "@repo/types";
import { AdminOrganizationDisplayStatus } from "@/screens/Maintainer/hooks/organizationDisplayStatus";
import { VOCAB } from "@/config/vocab";
import { sortOrderByLabel, StatusConfig, StatusFamily } from "./types";

export const ADMIN_ORGANIZATION_STATUS_CONFIG: Record<
  AdminOrganizationDisplayStatus,
  StatusConfig
> = {
  [AdminOrganizationDisplayStatus.WITH_MEASUREMENTS]: {
    family: StatusFamily.POSITIVE,
    label: "con Mediciones",
    tooltip: `${capitalize(VOCAB.organization.noun.singular)} con mediciones de huella registradas`,
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
    label: `No ${VOCAB.inscription.adjective.singular}`,
    tooltip: `${capitalize(VOCAB.organization.noun.singular)} sin proceso de ${VOCAB.inscription.noun.singular}`,
    sortOrder: 2,
  },
  [AdminOrganizationDisplayStatus.BLOCKED]: {
    family: StatusFamily.NEGATIVE,
    label: "Bloqueada",
    tooltip: `${capitalize(VOCAB.organization.noun.singular)} bloqueada por la administración`,
    sortOrder: 3,
  },
};

export const ADMIN_ORGANIZATION_STATUS_SORT_ORDER_BY_LABEL = sortOrderByLabel(
  ADMIN_ORGANIZATION_STATUS_CONFIG
);

export const ORGANIZATION_DISPLAY_STATUS_CONFIG: Record<
  OrganizationDisplayStatus,
  StatusConfig
> = {
  [OrganizationDisplayStatusValues.ACCREDITED]: {
    family: StatusFamily.POSITIVE,
    label: capitalize(VOCAB.inscription.adjective.singular),
    tooltip: `${capitalize(VOCAB.organization.noun.singular)} ${VOCAB.inscription.adjective.singular} ante la administración`,
    sortOrder: 0,
  },
  [OrganizationDisplayStatusValues.NOT_ACCREDITED]: {
    family: StatusFamily.NEUTRAL,
    label: `No ${capitalize(VOCAB.inscription.adjective.singular)}`,
    tooltip: `${capitalize(VOCAB.organization.noun.singular)} sin proceso de ${VOCAB.inscription.noun.singular}`,
    sortOrder: 1,
  },
  [OrganizationDisplayStatusValues.BLOCKED]: {
    family: StatusFamily.NEGATIVE,
    label: "Bloqueada",
    tooltip: `${capitalize(VOCAB.organization.noun.singular)} bloqueada por la administración`,
    sortOrder: 2,
  },
};

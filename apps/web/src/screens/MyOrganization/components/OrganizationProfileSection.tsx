import { FC, memo } from "react";
import { Edit, StarOutline } from "@mui/icons-material";
import { Typography, useTheme, Theme } from "@mui/material";
import { SectionCard } from "./SectionCard";
import { InfoCard } from "./InfoCard";
import { InfoRow } from "./InfoRow";
import { AccreditationConfirmDialog } from "./AccreditationConfirmDialog";
import { RequestStatusChip } from "@/screens/Maintainer/components/RequestStatusChip";
import {
  GetOrganizationByIdResponse,
  SubmissionStatus,
  OrganizationDisplayStatus,
  OrganizationDisplayStatusValues,
} from "@repo/types";
import { useAccreditationDialog } from "../hooks";
import { VOCAB } from "@/config/vocab";
import { capitalize } from "lodash-es";

const DISPLAY_STATUS_LABELS: Record<OrganizationDisplayStatus, string> = {
  [OrganizationDisplayStatusValues.ACCREDITED]: capitalize(
    VOCAB.inscription.adjective.singular
  ),
  [OrganizationDisplayStatusValues.NOT_ACCREDITED]: `No ${capitalize(VOCAB.inscription.adjective.singular)}`,
  [OrganizationDisplayStatusValues.BLOCKED]: "Bloqueada",
};

const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  [SubmissionStatus.PENDING]: "Pendiente",
  [SubmissionStatus.APPROVED]: "Aprobada",
  [SubmissionStatus.REVIEWED]: "Con observaciones",
  [SubmissionStatus.REJECTED]: "Rechazada",
  [SubmissionStatus.APPROVED_AUTOMATICALLY]: "Aprobada Automáticamente",
};

const getDisplayStatusColor = (
  status: OrganizationDisplayStatus,
  theme: Theme
): string => {
  const colorMap = {
    [OrganizationDisplayStatusValues.ACCREDITED]: theme.palette.success.light,
    [OrganizationDisplayStatusValues.NOT_ACCREDITED]: theme.palette.grey[400],
    [OrganizationDisplayStatusValues.BLOCKED]: theme.palette.error.light,
  };
  return colorMap[status];
};

const getSubmissionStatusColor = (
  status: SubmissionStatus,
  theme: Theme
): string => {
  const colorMap = {
    [SubmissionStatus.PENDING]: theme.palette.info.light,
    [SubmissionStatus.APPROVED]: theme.palette.success.light,
    [SubmissionStatus.REVIEWED]: theme.palette.warning.light,
    [SubmissionStatus.REJECTED]: theme.palette.error.light,
    [SubmissionStatus.APPROVED_AUTOMATICALLY]: theme.palette.success.light,
  };
  return colorMap[status];
};

type OrganizationProfileSectionProps = {
  profile: GetOrganizationByIdResponse;
  onEdit: () => void;
  canManageOrganization: boolean;
};

const OrganizationProfileSectionComponent: FC<
  OrganizationProfileSectionProps
> = ({ profile, onEdit, canManageOrganization }) => {
  const representative = profile.representative;
  const theme = useTheme();
  const accreditationDialog = useAccreditationDialog(profile.id);

  const actions = canManageOrganization
    ? [
        {
          label: "EDITAR",
          icon: <Edit />,
          onClick: onEdit,
          disabled: !profile.isEditable,
          title: !profile.isEditable
            ? `${capitalize(VOCAB.organization.article.singular)} tiene una postulación pendiente`
            : undefined,
        },
      ]
    : [];

  // Add Accredit action if not accredited
  if (
    canManageOrganization &&
    profile.status === OrganizationDisplayStatusValues.NOT_ACCREDITED &&
    profile.lastSubmissionStatus !== SubmissionStatus.PENDING
  ) {
    actions.push({
      label: `SOLICITAR ${VOCAB.inscription.noun.singular.toUpperCase()}`,
      icon: <StarOutline />,
      onClick: accreditationDialog.openDialog,
      disabled: false,
      title: `Solicitar ${VOCAB.inscription.noun.singular} de ${VOCAB.organization.article.singular}`,
    });
  }

  return (
    <>
      <SectionCard
        title={`Perfil ${VOCAB.organization.noun.singular}`}
        actions={actions}
      >
        <InfoCard title={profile.name}>
          <InfoRow
            label="Estado"
            value={
              <RequestStatusChip
                label={DISPLAY_STATUS_LABELS[profile.status]}
                color={getDisplayStatusColor(profile.status, theme)}
              />
            }
          />
          {profile.lastSubmissionStatus && (
            <InfoRow
              label="Estado última solicitud"
              value={
                <RequestStatusChip
                  label={SUBMISSION_STATUS_LABELS[profile.lastSubmissionStatus]}
                  color={getSubmissionStatusColor(
                    profile.lastSubmissionStatus,
                    theme
                  )}
                />
              }
            />
          )}
          <InfoRow label="RUT / RUC" value={profile.taxId} />
          <InfoRow label="Razón social" value={profile.legalName} />
          <InfoRow
            label="Rubro / Sector económico"
            value={profile.sector?.name ?? "-"}
          />
          <InfoRow label="Sub-rubro" value={profile.subsector?.name ?? "-"} />
          <InfoRow
            label={`Tamaño de ${VOCAB.organization.article.singular}`}
            value={profile.countryOrganizationSize?.name ?? "-"}
          />
          <InfoRow
            label="Actividad principal"
            value={profile.mainActivity?.name ?? "-"}
          />
          <InfoRow label="Dirección" value={profile.address ?? "-"} />
          <InfoRow
            label="Número de trabajadores"
            value={profile.employeesCount?.toString() ?? "-"}
          />
        </InfoCard>

        <Typography variant="h6" fontWeight={600}>
          Representante
        </Typography>
        <InfoCard title={representative.fullName}>
          <InfoRow
            label="ID representante / Rut"
            value={representative.taxId}
          />
          <InfoRow label="Cargo" value={representative.position.name} />
          <InfoRow label="Correo" value={representative.email} />
          <InfoRow label="Teléfono" value={representative.phone} />
        </InfoCard>
      </SectionCard>

      <AccreditationConfirmDialog
        open={accreditationDialog.isOpen}
        onClose={accreditationDialog.closeDialog}
        onConfirm={accreditationDialog.handleConfirm}
        isLoading={accreditationDialog.isLoading}
      />
    </>
  );
};

export const OrganizationProfileSection = memo(
  OrganizationProfileSectionComponent
);

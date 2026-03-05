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

const DISPLAY_STATUS_LABELS: Record<OrganizationDisplayStatus, string> = {
  ACCREDITED: "Acreditada",
  NOT_ACCREDITED: "No Acreditada",
  BLOCKED: "Bloqueada",
};

const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

const getDisplayStatusColor = (
  status: OrganizationDisplayStatus,
  theme: Theme
): string => {
  const colorMap = {
    ACCREDITED: theme.palette.success.light,
    NOT_ACCREDITED: theme.palette.grey[400],
    BLOCKED: theme.palette.error.light,
  };
  return colorMap[status];
};

const getSubmissionStatusColor = (
  status: SubmissionStatus,
  theme: Theme
): string => {
  const colorMap = {
    PENDING: theme.palette.warning.light,
    APPROVED: theme.palette.success.light,
    REJECTED: theme.palette.error.light,
  };
  return colorMap[status];
};

type OrganizationProfileSectionProps = {
  profile: GetOrganizationByIdResponse;
  onEdit: () => void;
};

const OrganizationProfileSectionComponent: FC<
  OrganizationProfileSectionProps
> = ({ profile, onEdit }) => {
  const representative = profile.representative;
  const theme = useTheme();
  const accreditationDialog = useAccreditationDialog(profile.id);

  const actions = [
    {
      label: "EDITAR",
      icon: <Edit />,
      onClick: onEdit,
      disabled: !profile.isEditable,
      title: !profile.isEditable
        ? "La empresa tiene una postulación pendiente"
        : undefined,
    },
  ];

  // Add Accredit action if not accredited
  if (
    profile.status === OrganizationDisplayStatusValues.NOT_ACCREDITED &&
    profile.lastSubmissionStatus !== SubmissionStatus.PENDING
  ) {
    actions.push({
      label: "SOLICITAR ACREDITACIÓN",
      icon: <StarOutline />,
      onClick: accreditationDialog.openDialog,
      disabled: false,
      title: "Solicitar acreditación de la empresa",
    });
  }

  return (
    <>
      <SectionCard title="Perfil empresa" actions={actions}>
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
            label="Tamaño de organización"
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

import React, { FC, memo, useCallback, useMemo, useState } from "react";
import { Edit, StarOutline } from "@mui/icons-material";
import {
  Typography,
  useTheme,
  Theme,
  IconButton,
  Popper,
  Fade,
  Box,
  ClickAwayListener,
  Tooltip,
} from "@mui/material";
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
  SubmissionEventType,
} from "@repo/types";
import { useAccreditationDialog } from "../hooks";
import { VOCAB } from "@/config/vocab";
import { capitalize } from "lodash-es";
import { useGetOrganizationHistory } from "@/api/query";
import { HistoryCard } from "@/components/dialogs/SubmissionHistory";
import { VisibilityOutlined } from "@mui/icons-material";

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
  [SubmissionStatus.APPROVED_AUTOMATICALLY]: "Aprobada Automáticamente",
  [SubmissionStatus.REJECTED]: "Rechazada",
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
    [SubmissionStatus.APPROVED_AUTOMATICALLY]: theme.palette.success.light,
    [SubmissionStatus.REJECTED]: theme.palette.error.light,
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [arrowRef, setArrowRef] = useState<HTMLElement | null>(null);

  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setOpen((previousOpen) => !previousOpen);
  }, []);

  const handleClickAway = useCallback(() => {
    setOpen(false);
  }, []);

  const canBeOpen = open && Boolean(anchorEl);
  const id = canBeOpen ? "transition-popper" : undefined;

  const accreditationDialog = useAccreditationDialog(profile.id);

  const orgHistory = useGetOrganizationHistory(profile.id);

  const lastSubmission = useMemo(
    () => orgHistory.data?.[0] ?? null,
    [orgHistory.data]
  );

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
                <Box className="flex flex-row items-center gap-1">
                  <RequestStatusChip
                    label={
                      SUBMISSION_STATUS_LABELS[profile.lastSubmissionStatus]
                    }
                    color={getSubmissionStatusColor(
                      profile.lastSubmissionStatus,
                      theme
                    )}
                  />
                  {lastSubmission?.eventType === SubmissionEventType.REVIEWED &&
                    profile.lastSubmissionStatus ===
                      SubmissionStatus.REVIEWED && (
                      <>
                        <Tooltip
                          title="Ver detalles de la revisión"
                          placement="top"
                        >
                          <IconButton
                            aria-describedby={id}
                            aria-label="Ver detalles de la revisión"
                            aria-expanded={open}
                            onClick={handleClick}
                            size="small"
                          >
                            <VisibilityOutlined />
                          </IconButton>
                        </Tooltip>
                        <Popper
                          id={id}
                          open={open}
                          anchorEl={anchorEl}
                          transition
                          placement="bottom"
                          modifiers={[
                            {
                              name: "arrow",
                              enabled: true,
                              options: {
                                element: arrowRef,
                              },
                            },
                          ]}
                          sx={{
                            '&[data-popper-placement*="bottom"] .popper-arrow':
                              {
                                top: 0,
                                marginTop: "-0.5em",
                                "&::before": {
                                  borderWidth: "0 1em 1em 1em",
                                  borderColor: `transparent transparent white transparent`,
                                },
                              },

                            ".popper-arrow": {
                              position: "absolute",
                              fontSize: 14,
                              width: "3em",
                              height: "3em",
                              "&::before": {
                                content: '""',
                                margin: "auto",
                                display: "block",
                                width: 0,
                                height: 0,
                                borderStyle: "solid",
                              },
                            },
                          }}
                        >
                          {({ TransitionProps }) => (
                            <Fade {...TransitionProps} timeout={350}>
                              <Box>
                                <Box
                                  component="span"
                                  className="popper-arrow"
                                  ref={setArrowRef}
                                />
                                <ClickAwayListener
                                  onClickAway={handleClickAway}
                                >
                                  <Box className="w-[700px] rounded-[10px] border-2 shadow-lg">
                                    <HistoryCard entry={lastSubmission} />
                                  </Box>
                                </ClickAwayListener>
                              </Box>
                            </Fade>
                          )}
                        </Popper>
                      </>
                    )}
                </Box>
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

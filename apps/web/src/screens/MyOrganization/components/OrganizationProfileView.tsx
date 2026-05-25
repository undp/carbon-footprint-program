import React, { FC, useCallback, useMemo, useState } from "react";
import {
  Typography,
  IconButton,
  Popper,
  Fade,
  Box,
  ClickAwayListener,
  Tooltip,
} from "@mui/material";
import { VisibilityOutlined } from "@mui/icons-material";
import {
  GetOrganizationByIdResponse,
  SubmissionStatus,
  SubmissionEventType,
} from "@repo/types";
import { InfoCard } from "./InfoCard";
import { InfoRow } from "./InfoRow";
import { StatusChip } from "@/components/StatusChip";
import { useGetOrganizationHistory } from "@/api/query";
import { HistoryCard } from "@/components/dialogs/SubmissionHistory";
import { ORGANIZATION_DISPLAY_STATUS_CONFIG } from "@/labels/chips/organization";
import { SUBMISSION_STATUS_CONFIG } from "@/labels/chips/submission";
import { VOCAB } from "@/config/vocab";

type OrganizationProfileViewProps = {
  profile: GetOrganizationByIdResponse;
};

export const OrganizationProfileView: FC<OrganizationProfileViewProps> = ({
  profile,
}) => {
  const representative = profile.representative;
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

  const orgHistory = useGetOrganizationHistory(profile.id);

  const lastSubmission = useMemo(
    () => orgHistory.data?.[0] ?? null,
    [orgHistory.data]
  );

  return (
    <>
      <InfoCard title={profile.name}>
        <InfoRow
          label="Estado"
          value={
            <StatusChip
              config={ORGANIZATION_DISPLAY_STATUS_CONFIG[profile.status]}
            />
          }
        />
        {profile.lastSubmissionStatus && (
          <InfoRow
            label="Estado última solicitud"
            value={
              <Box className="flex flex-row items-center gap-1">
                <StatusChip
                  config={
                    SUBMISSION_STATUS_CONFIG[profile.lastSubmissionStatus]
                  }
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
                          loading={orgHistory.isLoading}
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
                          '&[data-popper-placement*="bottom"] .popper-arrow': {
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
                              <ClickAwayListener onClickAway={handleClickAway}>
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
        <InfoRow label="RUT / RUC" value={profile.taxId ?? "-"} />
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
        <InfoRow label="ID representante / Rut" value={representative.taxId} />
        <InfoRow label="Cargo" value={representative.position?.name} />
        <InfoRow label="Correo" value={representative.email} />
        <InfoRow label="Teléfono" value={representative.phone} />
      </InfoCard>
    </>
  );
};

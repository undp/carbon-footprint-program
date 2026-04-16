import { FC, useCallback, PropsWithChildren } from "react";
import { Box, IconButtonProps, IconButton, Tooltip } from "@mui/material";
import {
  EditOutlined,
  VisibilityOutlined,
  FileDownloadOutlined,
  DescriptionOutlined,
} from "@mui/icons-material";
import { useDownloadReductionProject } from "../hooks/useDownloadReductionProject";
import { useState } from "react";
import { Badge } from "@mui/material";
import {
  GetAllReductionProjectsResponse,
  ReductionProjectDisplayStatusEnum,
} from "@repo/types";
import { isReductionProjectEditable } from "@repo/utils";
import { Routes } from "@/interfaces";
import { useNavigate } from "@tanstack/react-router";
import { ViewSubmissionDialog } from "@/components/dialogs/SubmissionHistory";

const BaseIconButton: FC<PropsWithChildren<IconButtonProps>> = ({
  children,
  ...props
}) => (
  <IconButton
    sx={(theme) => ({
      border: `1px solid ${props.disabled ? theme.palette.action.disabled : theme.palette.primary.main}`,
      borderRadius: "4px",
      padding: "4px",
    })}
    color="primary"
    size="small"
    {...props}
  >
    {children}
  </IconButton>
);

interface ReductionProjectActionsCellProps {
  reductionProject: GetAllReductionProjectsResponse[number];
}

export const ReductionProjectActionsCell: FC<
  ReductionProjectActionsCellProps
> = ({ reductionProject }) => {
  const navigate = useNavigate();
  const { download, isDownloading } = useDownloadReductionProject();
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const canEdit = isReductionProjectEditable(reductionProject.status);

  const onEditClick = useCallback(() => {
    void navigate({
      to: Routes.REDUCTION_PROJECT_EDIT,
      params: { id: reductionProject.id },
    });
  }, [navigate, reductionProject.id]);

  const onViewClick = useCallback(() => {
    void navigate({
      to: Routes.REDUCTION_PROJECT_DETAILS,
      params: { id: reductionProject.id },
    });
  }, [navigate, reductionProject.id]);

  const onDownloadClick = useCallback(() => {
    void download(reductionProject.id, reductionProject.organizationName);
  }, [download, reductionProject.id, reductionProject.organizationName]);

  return (
    <>
      <Box className="flex justify-center gap-1">
        {canEdit ? (
          <Tooltip title="Editar proyecto">
            <BaseIconButton onClick={onEditClick} aria-label="Editar proyecto">
              <EditOutlined fontSize="small" />
            </BaseIconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Ver proyecto">
            <span>
              <BaseIconButton onClick={onViewClick} aria-label="Ver proyecto">
                <VisibilityOutlined fontSize="small" />
              </BaseIconButton>
            </span>
          </Tooltip>
        )}

        {/* Historial */}
        <Tooltip title="Historial">
          <span>
            <Badge
              variant="dot"
              invisible={
                reductionProject.status !==
                ReductionProjectDisplayStatusEnum.REVIEWED
              }
              overlap="circular"
              sx={{
                "& .MuiBadge-badge": {
                  top: 2,
                  right: 2,
                  backgroundColor: (theme) => theme.palette.warning.main,
                },
              }}
            >
              <BaseIconButton
                onClick={() => setHistoryDialogOpen(true)}
                aria-label="Historial"
              >
                <DescriptionOutlined fontSize="small" />
              </BaseIconButton>
            </Badge>
          </span>
        </Tooltip>
      </Box>

      {historyDialogOpen && (
        <ViewSubmissionDialog
          open={historyDialogOpen}
          reductionProjectId={reductionProject.id}
          onClose={() => setHistoryDialogOpen(false)}
        />
      )}
      <Tooltip title="Descargar proyecto">
        <span>
          <BaseIconButton
            onClick={onDownloadClick}
            disabled={isDownloading}
            aria-label="Descargar proyecto"
          >
            <FileDownloadOutlined fontSize="small" />
          </BaseIconButton>
        </span>
      </Tooltip>
    </>
  );
};

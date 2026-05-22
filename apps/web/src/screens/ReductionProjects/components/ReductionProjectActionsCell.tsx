import { FC, useCallback, useState } from "react";
import { Badge, Box } from "@mui/material";
import {
  EditOutlined,
  VisibilityOutlined,
  FileDownloadOutlined,
  DescriptionOutlined,
} from "@mui/icons-material";
import { useDownloadReductionProject } from "../hooks/useDownloadReductionProject";
import {
  GetAllReductionProjectsResponse,
  ReductionProjectDisplayStatusEnum,
} from "@repo/types";
import { isReductionProjectEditable } from "@repo/utils";
import { Routes } from "@/interfaces";
import { useNavigate } from "@tanstack/react-router";
import { ViewSubmissionDialog } from "@/components/dialogs/SubmissionHistory";
import { BaseActionButton } from "@/components";

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
          <BaseActionButton
            tooltip="Editar proyecto"
            onClick={onEditClick}
            aria-label="Editar proyecto"
          >
            <EditOutlined fontSize="small" />
          </BaseActionButton>
        ) : (
          <BaseActionButton
            tooltip="Ver proyecto"
            onClick={onViewClick}
            aria-label="Ver proyecto"
          >
            <VisibilityOutlined fontSize="small" />
          </BaseActionButton>
        )}

        {/* Historial */}
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
          <BaseActionButton
            tooltip="Historial"
            onClick={() => setHistoryDialogOpen(true)}
            aria-label="Historial"
          >
            <DescriptionOutlined fontSize="small" />
          </BaseActionButton>
        </Badge>

        <BaseActionButton
          tooltip="Descargar proyecto"
          onClick={onDownloadClick}
          disabled={isDownloading}
          aria-label="Descargar proyecto"
        >
          <FileDownloadOutlined fontSize="small" />
        </BaseActionButton>
      </Box>

      {historyDialogOpen && (
        <ViewSubmissionDialog
          open={historyDialogOpen}
          reductionProjectId={reductionProject.id}
          onClose={() => setHistoryDialogOpen(false)}
        />
      )}
    </>
  );
};

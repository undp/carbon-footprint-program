import { FC, useCallback, useState } from "react";
import { Box } from "@mui/material";
import {
  EditOutlined,
  VisibilityOutlined,
  FileDownloadOutlined,
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
import { AppActionButton, HistoryActionButton } from "@/components";

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
          <AppActionButton tooltip="Editar proyecto" onClick={onEditClick}>
            <EditOutlined fontSize="small" />
          </AppActionButton>
        ) : (
          <AppActionButton tooltip="Ver proyecto" onClick={onViewClick}>
            <VisibilityOutlined fontSize="small" />
          </AppActionButton>
        )}

        {/* Historial */}
        <HistoryActionButton
          hasUpdate={
            reductionProject.status ===
            ReductionProjectDisplayStatusEnum.REVIEWED
          }
          onClick={() => setHistoryDialogOpen(true)}
        />

        <AppActionButton
          tooltip="Descargar proyecto"
          onClick={onDownloadClick}
          disabled={isDownloading}
        >
          <FileDownloadOutlined fontSize="small" />
        </AppActionButton>
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

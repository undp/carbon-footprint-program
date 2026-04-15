import { FC, useCallback, useState, PropsWithChildren } from "react";
import { Box, IconButtonProps, IconButton, Tooltip } from "@mui/material";
import {
  EditOutlined,
  VisibilityOutlined,
  FileDownloadOutlined,
} from "@mui/icons-material";
import { GetAllReductionProjectsResponse } from "@repo/types";
import { isReductionProjectEditable } from "@repo/utils";
import { Routes } from "@/interfaces";
import { useNavigate } from "@tanstack/react-router";
import { exportReductionProjectToExcel } from "@/utils/exportReductionProjectToExcel";
import { enqueueSnackbar } from "notistack";

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

  const canEdit = isReductionProjectEditable(reductionProject.status);
  const [isDownloading, setIsDownloading] = useState(false);

  const onEditClick = useCallback(() => {
    void navigate({
      to: Routes.REDUCTION_PROJECT,
      params: { id: reductionProject.id },
    });
  }, [navigate, reductionProject.id]);

  const onDownloadClick = useCallback(async () => {
    setIsDownloading(true);
    try {
      await exportReductionProjectToExcel(reductionProject.id);
    } catch {
      enqueueSnackbar("No se pudo descargar el proyecto", { variant: "error" });
    } finally {
      setIsDownloading(false);
    }
  }, [reductionProject.id]);

  return (
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
            <BaseIconButton onClick={onEditClick} aria-label="Ver proyecto">
              <VisibilityOutlined fontSize="small" />
            </BaseIconButton>
          </span>
        </Tooltip>
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
    </Box>
  );
};

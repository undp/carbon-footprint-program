import { FC, useCallback, PropsWithChildren } from "react";
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
import { useDownloadReductionProject } from "../hooks/useDownloadReductionProject";

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
  organizationName: string;
}

export const ReductionProjectActionsCell: FC<
  ReductionProjectActionsCellProps
> = ({ reductionProject, organizationName }) => {
  const navigate = useNavigate();
  const { download, isDownloading } = useDownloadReductionProject();

  const canEdit = isReductionProjectEditable(reductionProject.status);

  const onEditClick = useCallback(() => {
    void navigate({
      to: Routes.REDUCTION_PROJECT,
      params: { id: reductionProject.id },
    });
  }, [navigate, reductionProject.id]);

  const onDownloadClick = useCallback(() => {
    void download(reductionProject.id, organizationName);
  }, [download, reductionProject.id, organizationName]);

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

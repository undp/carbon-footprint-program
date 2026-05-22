import { Badge, Box, SxProps, Theme } from "@mui/material";
import {
  UploadFileOutlined,
  CommentOutlined,
  DeleteOutlined,
} from "@mui/icons-material";
import { FC } from "react";
import { getColorPalette } from "@/utils/categoryColors";
import { BaseActionButton } from "@/components";

interface EmissionEditorActionsCellProps {
  rowId: string | number;
  uploadFiles?: (id: string | number) => void;
  updateComment?: (id: string | number) => void;
  deleteSource?: (id: string | number) => void;
  categoryColor?: string;
  disabled?: boolean;
  hasComment?: boolean;
  pendingFilesCount?: number;
  linkedFilesCount?: number;
}

export const EmissionEditorActionsCell: FC<EmissionEditorActionsCellProps> = ({
  rowId,
  uploadFiles,
  updateComment,
  deleteSource,
  categoryColor,
  disabled = false,
  hasComment = false,
  pendingFilesCount = 0,
  linkedFilesCount = 0,
}) => {
  const totalFilesCount = pendingFilesCount + linkedFilesCount;
  const categoryColorPalette = categoryColor
    ? getColorPalette(categoryColor)
    : undefined;

  const iconSx: SxProps<Theme> = {
    width: 32,
    height: 32,
    color: (theme) =>
      categoryColorPalette
        ? categoryColorPalette.main
        : theme.palette.text.primary,
  };

  return (
    <Box className="flex justify-center gap-3">
      {uploadFiles && (
        <Badge
          badgeContent={totalFilesCount}
          invisible={totalFilesCount === 0}
          overlap="circular"
          sx={{
            "& .MuiBadge-badge": {
              top: 2,
              right: 2,
              backgroundColor: (theme) => theme.palette.primary.main,
              color: (theme) => theme.palette.common.white,
            },
          }}
        >
          <BaseActionButton
            tooltip="Adjuntar archivos"
            aria-label="Adjuntar archivos"
            onClick={() => uploadFiles(rowId)}
            disabled={disabled}
            sx={iconSx}
          >
            <UploadFileOutlined fontSize="small" />
          </BaseActionButton>
        </Badge>
      )}
      {updateComment && (
        <Badge
          variant="dot"
          invisible={!hasComment}
          overlap="circular"
          sx={{
            "& .MuiBadge-badge": {
              top: 2,
              right: 2,
              backgroundColor: (theme) => theme.palette.primary.main,
            },
          }}
        >
          <BaseActionButton
            tooltip="Agregar información adicional"
            aria-label="Agregar información adicional"
            onClick={() => updateComment(rowId)}
            disabled={disabled}
            sx={iconSx}
          >
            <CommentOutlined fontSize="small" />
          </BaseActionButton>
        </Badge>
      )}
      {deleteSource && (
        <BaseActionButton
          tooltip="Eliminar fuente"
          aria-label="Eliminar fuente"
          onClick={() => deleteSource(rowId)}
          disabled={disabled}
          sx={iconSx}
        >
          <DeleteOutlined fontSize="small" />
        </BaseActionButton>
      )}
    </Box>
  );
};

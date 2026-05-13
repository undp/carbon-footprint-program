import { Badge, Box, SxProps, Theme } from "@mui/material";
import {
  SourceOutlined,
  CommentOutlined,
  DeleteOutlined,
} from "@mui/icons-material";
import { FC } from "react";
import { getColorPalette } from "@/utils/categoryColors";
import { ActionIconButton } from "@/components/ActionIconButton";

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
    borderRadius: 1,
    border: "1px solid",
    width: 32,
    height: 32,
    color: (theme) =>
      disabled
        ? theme.palette.action.disabled
        : categoryColorPalette
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
          <ActionIconButton
            icon={SourceOutlined}
            tooltip="Agregar archivos"
            aria-label="uploadFiles"
            onClick={() => uploadFiles(rowId)}
            disabled={disabled}
            size="medium"
            sx={iconSx}
          />
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
          <ActionIconButton
            icon={CommentOutlined}
            tooltip="Agregar información adicional"
            aria-label="addComment"
            onClick={() => updateComment(rowId)}
            disabled={disabled}
            size="medium"
            sx={iconSx}
          />
        </Badge>
      )}
      {deleteSource && (
        <ActionIconButton
          icon={DeleteOutlined}
          tooltip="Eliminar fuente"
          aria-label="delete"
          onClick={() => deleteSource(rowId)}
          disabled={disabled}
          size="medium"
          sx={iconSx}
        />
      )}
    </Box>
  );
};

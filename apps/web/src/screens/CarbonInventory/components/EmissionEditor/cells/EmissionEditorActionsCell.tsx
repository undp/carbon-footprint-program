import { Badge, Box, SxProps, Theme } from "@mui/material";
import {
  UploadFileOutlined,
  CommentOutlined,
  DeleteOutlined,
} from "@mui/icons-material";
import { FC } from "react";
import { getColorPalette } from "@/utils/categoryColors";
import { AppActionButton } from "@/components";
import { onboardingTargetProps } from "@/utils/onboardingHighlight";

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
      {/* Tagged on the attach + extra-info pair rather than on either button
          (one spotlight introduces both) and NOT on the whole row: the
          highlight marks itself as followed on any click inside the tagged
          element, so keeping "Eliminar fuente" out means deleting the
          spotlighted line can't burn a one-time hint the user never read. The
          ids repeat harmlessly across rows because the resolver takes the
          first match. */}
      {(uploadFiles || updateComment) && (
        <Box
          className="flex gap-3"
          {...onboardingTargetProps("emission-capture-line-actions")}
        >
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
              <AppActionButton
                tooltip="Adjuntar archivos"
                onClick={() => uploadFiles(rowId)}
                disabled={disabled}
                sx={iconSx}
              >
                <UploadFileOutlined />
              </AppActionButton>
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
              <AppActionButton
                tooltip="Agregar información adicional"
                onClick={() => updateComment(rowId)}
                disabled={disabled}
                sx={iconSx}
              >
                <CommentOutlined />
              </AppActionButton>
            </Badge>
          )}
        </Box>
      )}
      {deleteSource && (
        <AppActionButton
          tooltip="Eliminar fuente"
          onClick={() => deleteSource(rowId)}
          disabled={disabled}
          sx={iconSx}
        >
          <DeleteOutlined />
        </AppActionButton>
      )}
    </Box>
  );
};

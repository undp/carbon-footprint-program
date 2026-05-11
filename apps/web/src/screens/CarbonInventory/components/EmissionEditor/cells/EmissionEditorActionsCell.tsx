import { Badge, Box, IconButton, SxProps, Theme } from "@mui/material";
import {
  SourceOutlined,
  CommentOutlined,
  DeleteOutlined,
} from "@mui/icons-material";
import { FC } from "react";
import { getColorPalette } from "@/utils/categoryColors";

interface EmissionEditorActionsCellProps {
  rowId: string | number;
  uploadFiles?: (id: string | number) => void;
  updateComment?: (id: string | number) => void;
  deleteSource?: (id: string | number) => void;
  categoryColor?: string;
  disabled?: boolean;
  hasComment?: boolean;
  hasPendingFiles?: boolean;
  hasLinkedFiles?: boolean;
}

export const EmissionEditorActionsCell: FC<EmissionEditorActionsCellProps> = ({
  rowId,
  uploadFiles,
  updateComment,
  deleteSource,
  categoryColor,
  disabled = false,
  hasComment = false,
  hasPendingFiles = false,
  hasLinkedFiles = false,
}) => {
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
    <Box className="flex justify-center gap-1">
      {uploadFiles && (
        <Badge
          variant="dot"
          invisible={!hasPendingFiles && !hasLinkedFiles}
          overlap="circular"
          sx={{
            "& .MuiBadge-badge": {
              top: 2,
              right: 2,
              backgroundColor: (theme) =>
                hasPendingFiles
                  ? theme.palette.warning.main
                  : theme.palette.primary.main,
            },
          }}
        >
          <IconButton
            sx={iconSx}
            aria-label="uploadFiles"
            onClick={() => uploadFiles(rowId)}
            disabled={disabled}
          >
            <SourceOutlined fontSize="inherit" />
          </IconButton>
        </Badge>
      )}
      {updateComment && (
        <Badge
          variant="dot"
          color="primary"
          invisible={!hasComment}
          overlap="circular"
          sx={{
            "& .MuiBadge-badge": {
              top: 2,
              right: 2,
            },
          }}
        >
          <IconButton
            sx={iconSx}
            aria-label="addComment"
            onClick={() => updateComment(rowId)}
            disabled={disabled}
          >
            <CommentOutlined fontSize="inherit" />
          </IconButton>
        </Badge>
      )}
      {deleteSource && (
        <IconButton
          sx={iconSx}
          aria-label="delete"
          onClick={() => deleteSource(rowId)}
          disabled={disabled}
        >
          <DeleteOutlined fontSize="inherit" />
        </IconButton>
      )}
    </Box>
  );
};

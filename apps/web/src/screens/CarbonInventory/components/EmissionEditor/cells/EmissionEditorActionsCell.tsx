import { Badge, Box, IconButton, SxProps, Theme } from "@mui/material";
import {
  SourceOutlined,
  CommentOutlined,
  DeleteOutlined,
} from "@mui/icons-material";
import { FC } from "react";

interface EmissionEditorActionsCellProps {
  rowId: string | number;
  uploadFiles?: (id: string | number) => void;
  updateComment?: (id: string | number) => void;
  deleteSource?: (id: string | number) => void;
  categoryPosition?: number;
  disabled?: boolean;
  hasComment?: boolean;
}

export const EmissionEditorActionsCell: FC<EmissionEditorActionsCellProps> = ({
  rowId,
  uploadFiles,
  updateComment,
  deleteSource,
  categoryPosition,
  disabled = false,
  hasComment = false,
}) => {
  const iconSx: SxProps<Theme> = {
    borderRadius: 1,
    border: "1px solid",
    width: 32,
    height: 32,
    color: (theme) =>
      disabled
        ? theme.palette.action.disabled
        : categoryPosition
          ? theme.palette.category[categoryPosition].main
          : theme.palette.text.primary,
  };

  return (
    <Box className="flex justify-center gap-1">
      {uploadFiles && (
        <IconButton
          sx={iconSx}
          aria-label="uploadFiles"
          onClick={() => uploadFiles(rowId)}
          disabled={disabled}
        >
          <SourceOutlined fontSize="inherit" />
        </IconButton>
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

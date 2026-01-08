import { Box, IconButton, SxProps, Theme } from "@mui/material";
import {
  SourceOutlined,
  CommentOutlined,
  DeleteOutlined,
} from "@mui/icons-material";
import { FC } from "react";

interface Props {
  rowId: string | number;
  uploadFiles?: (id: string | number) => void;
  updateComment?: (id: string | number) => void;
  deleteSource?: (id: string | number) => void;
  categoryPosition?: number;
}

export const ActionsCell: FC<Props> = ({
  rowId,
  uploadFiles,
  updateComment,
  deleteSource,
  categoryPosition,
}) => {
  const iconSx: SxProps<Theme> = {
    borderRadius: 1,
    border: "1px solid",
    width: 32,
    height: 32,
    color: (theme) =>
      categoryPosition
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
        >
          <SourceOutlined fontSize="inherit" />
        </IconButton>
      )}
      {updateComment && (
        <IconButton
          sx={iconSx}
          aria-label="addComment"
          onClick={() => updateComment(rowId)}
        >
          <CommentOutlined fontSize="inherit" />
        </IconButton>
      )}
      {deleteSource && (
        <IconButton
          sx={iconSx}
          aria-label="delete"
          onClick={() => deleteSource(rowId)}
        >
          <DeleteOutlined fontSize="inherit" />
        </IconButton>
      )}
    </Box>
  );
};

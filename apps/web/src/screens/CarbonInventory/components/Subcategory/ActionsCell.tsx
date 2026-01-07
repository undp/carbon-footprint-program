import { Box, IconButton, SxProps, Theme } from "@mui/material";
import {
  SourceOutlined,
  CommentOutlined,
  DeleteOutlined,
} from "@mui/icons-material";
import { GridRowId } from "@mui/x-data-grid";
import { FC } from "react";

interface Props {
  rowId: GridRowId;
  viewDetails: (id: GridRowId) => void;
  updateComment: (id: GridRowId) => void;
  deleteSource: (id: GridRowId) => void;
  categoryPosition: number;
}

export const ActionsCell: FC<Props> = ({
  rowId,
  viewDetails,
  updateComment,
  deleteSource,
  categoryPosition,
}) => {
  const iconSx: SxProps<Theme> = {
    borderRadius: 1,
    border: "1px solid",
    width: 32,
    height: 32,
    color: (theme) => theme.palette.category[categoryPosition].main,
  };

  return (
    <Box className="flex justify-center gap-1">
      <IconButton
        sx={iconSx}
        aria-label="viewDetails"
        onClick={() => viewDetails(rowId)}
      >
        <SourceOutlined fontSize="inherit" />
      </IconButton>
      <IconButton
        sx={iconSx}
        aria-label="addComment"
        onClick={() => updateComment(rowId)}
      >
        <CommentOutlined fontSize="inherit" />
      </IconButton>
      <IconButton
        sx={iconSx}
        aria-label="delete"
        onClick={() => deleteSource(rowId)}
      >
        <DeleteOutlined fontSize="inherit" />
      </IconButton>
    </Box>
  );
};

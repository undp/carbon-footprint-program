import { SxProps, Theme } from "@mui/material";

export const headerCellSx: SxProps<Theme> = {
  backgroundColor: "action.hover",
  fontWeight: 500,
  color: "text.primary",
  borderBottom: 1,
  borderColor: "divider",
  py: 1,
};

export const bodyCellSx: SxProps<Theme> = {
  backgroundColor: "background.paper",
  borderBottom: 1,
  borderColor: "divider",
  py: 2,
};

export const tableContainerSx: SxProps<Theme> = {
  border: 1,
  borderColor: "divider",
  borderRadius: 1,
  overflow: "hidden",
};

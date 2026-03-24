import { SxProps, Theme } from "@mui/material";
import type { ReductionProjectStatus } from "../types";

export const getStatusConfig = (
  status: ReductionProjectStatus
): { label: string; bgColor: string; textColor: string } => {
  switch (status) {
    case "APPROVED":
      return { label: "APROBADO", bgColor: "rgba(130, 199, 132, 0.3)", textColor: "#345035" };
    case "DRAFT":
      return { label: "BORRADOR", bgColor: "rgba(189, 189, 189, 0.3)", textColor: "#424242" };
    case "IN_REVIEW":
      return { label: "EN REVISIÓN", bgColor: "rgba(100, 181, 246, 0.3)", textColor: "#284862" };
    case "REJECTED":
      return { label: "RECHAZADO", bgColor: "rgba(211, 47, 47, 0.3)", textColor: "#8B0000" };
    case "OBJECTED":
      return { label: "OBJETADO", bgColor: "rgba(255, 152, 0, 0.2)", textColor: "#E65100" };
  }
};

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

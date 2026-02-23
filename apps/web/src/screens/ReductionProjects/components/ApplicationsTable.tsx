import { FC } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Tooltip,
} from "@mui/material";
import { Download } from "@mui/icons-material";
import { SealApplication, SealApplicationStatus } from "../types";
import { headerCellSx, bodyCellSx, tableContainerSx } from "./tableStyles";

type ApplicationsTableProps = {
  applications: SealApplication[];
  onDownload?: (application: SealApplication) => void;
};

const getStatusConfig = (
  status: SealApplicationStatus
): { label: string; bgColor: string; textColor: string } => {
  switch (status) {
    case "APPROVED":
      return {
        label: "APROBADO",
        bgColor: "rgba(130, 199, 132, 0.3)",
        textColor: "#345035",
      };
    case "PENDING":
      return {
        label: "PENDIENTE",
        bgColor: "rgba(255, 183, 77, 0.3)",
        textColor: "#66491F",
      };
    case "IN_REVIEW":
      return {
        label: "EN REVISIÓN",
        bgColor: "rgba(100, 181, 246, 0.3)",
        textColor: "#284862",
      };
    case "REJECTED":
      return {
        label: "RECHAZADO",
        bgColor: "rgba(211, 47, 47, 0.3)",
        textColor: "#8B0000",
      };
    default:
      return {
        label: status,
        bgColor: "rgba(158, 158, 158, 0.3)",
        textColor: "#616161",
      };
  }
};

export const ApplicationsTable: FC<ApplicationsTableProps> = ({
  applications,
  onDownload,
}) => {
  return (
    <TableContainer component={Box} sx={tableContainerSx}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={headerCellSx}>Año de reducción</TableCell>
            <TableCell sx={{ ...headerCellSx, textAlign: "center" }}>
              Fecha
            </TableCell>
            <TableCell sx={headerCellSx}>Sello</TableCell>
            <TableCell sx={{ ...headerCellSx, textAlign: "center" }}>
              Estado
            </TableCell>
            <TableCell sx={{ ...headerCellSx, textAlign: "center" }}>
              Acciones
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {applications.map((application) => {
            const statusConfig = getStatusConfig(application.status);
            return (
              <TableRow key={application.id}>
                <TableCell sx={{ ...bodyCellSx, textAlign: "center" }}>
                  {application.reductionYear}
                </TableCell>
                <TableCell sx={{ ...bodyCellSx, textAlign: "center" }}>
                  {application.applicationDate}
                </TableCell>
                <TableCell sx={bodyCellSx}>{application.sealName}</TableCell>
                <TableCell sx={{ ...bodyCellSx, textAlign: "center" }}>
                  <Chip
                    label={statusConfig.label}
                    size="small"
                    sx={{
                      backgroundColor: statusConfig.bgColor,
                      color: statusConfig.textColor,
                      fontWeight: 500,
                      fontSize: "0.75rem",
                      borderRadius: "14px",
                      border: `1px solid ${statusConfig.bgColor}`,
                    }}
                  />
                </TableCell>
                <TableCell sx={{ ...bodyCellSx, textAlign: "center" }}>
                  <Tooltip title="Descargar">
                    <IconButton
                      size="small"
                      onClick={() => onDownload?.(application)}
                      sx={{
                        border: 1,
                        borderColor: "primary.main",
                        borderRadius: 1,
                        width: 32,
                        height: 32,
                      }}
                    >
                      <Download sx={{ fontSize: 20, color: "primary.main" }} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

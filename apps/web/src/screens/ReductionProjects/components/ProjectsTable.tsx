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
  Tooltip,
} from "@mui/material";
import { SystemUpdateAlt, Download } from "@mui/icons-material";
import { ReductionProject } from "../types";

type ProjectsTableProps = {
  projects: ReductionProject[];
  onEdit?: (project: ReductionProject) => void;
  onDownload?: (project: ReductionProject) => void;
};

const headerCellSx = {
  backgroundColor: "rgba(65, 64, 70, 0.03)",
  fontWeight: 500,
  color: "text.primary",
  borderBottom: "1px solid #d9d9d9",
  py: 1,
};

const bodyCellSx = {
  backgroundColor: "white",
  borderBottom: "1px solid #d9d9d9",
  py: 2,
};

export const ProjectsTable: FC<ProjectsTableProps> = ({
  projects,
  onEdit,
  onDownload,
}) => {
  const formatNumber = (num: number) => {
    return num.toLocaleString("es-CL");
  };

  return (
    <TableContainer
      component={Box}
      sx={{ border: "1px solid #d9d9d9", borderRadius: 1, overflow: "hidden" }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ ...headerCellSx, width: "30%" }}>
              Nombre Proyecto
            </TableCell>
            <TableCell sx={{ ...headerCellSx, textAlign: "center" }}>
              Implementacion
            </TableCell>
            <TableCell sx={{ ...headerCellSx, textAlign: "center" }}>
              Primer Reporte
            </TableCell>
            <TableCell sx={{ ...headerCellSx, textAlign: "center" }}>
              Reduccion tCO<sub>2</sub>e
            </TableCell>
            <TableCell sx={{ ...headerCellSx, textAlign: "center" }}>
              Anos reportados
            </TableCell>
            <TableCell sx={{ ...headerCellSx, textAlign: "center" }}>
              Acciones
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id}>
              <TableCell sx={bodyCellSx}>{project.name}</TableCell>
              <TableCell sx={{ ...bodyCellSx, textAlign: "center" }}>
                {project.implementationDate}
              </TableCell>
              <TableCell sx={{ ...bodyCellSx, textAlign: "center" }}>
                {project.firstReportDate}
              </TableCell>
              <TableCell
                sx={{
                  ...bodyCellSx,
                  textAlign: "right",
                  fontWeight: 600,
                }}
              >
                {formatNumber(project.reductionTCO2e)}
              </TableCell>
              <TableCell sx={{ ...bodyCellSx, textAlign: "center" }}>
                {project.yearsReported}
              </TableCell>
              <TableCell sx={{ ...bodyCellSx, textAlign: "center" }}>
                <Box className="flex items-center justify-center gap-2">
                  <Tooltip title="Editar proyecto">
                    <IconButton
                      size="small"
                      onClick={() => onEdit?.(project)}
                      sx={{
                        border: "1px solid",
                        borderColor: "primary.main",
                        borderRadius: 1,
                        width: 32,
                        height: 32,
                      }}
                    >
                      <SystemUpdateAlt
                        sx={{ fontSize: 20, color: "primary.main" }}
                      />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Descargar">
                    <IconButton
                      size="small"
                      onClick={() => onDownload?.(project)}
                      sx={{
                        border: "1px solid",
                        borderColor: "primary.main",
                        borderRadius: 1,
                        width: 32,
                        height: 32,
                      }}
                    >
                      <Download sx={{ fontSize: 20, color: "primary.main" }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

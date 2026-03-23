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
  Chip,
} from "@mui/material";
import {
  Edit,
  Download,
  Visibility,
  ContentCopy,
  Delete,
  ChatBubbleOutline,
} from "@mui/icons-material";
import type { ReductionProjectSummary, ReductionProjectStatus } from "../types";
import { headerCellSx, bodyCellSx, tableContainerSx } from "./tableStyles";

const getStatusConfig = (
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

const ICON_COLOR = "#009689";
const actionBtnSx = {
  border: "1px solid",
  borderColor: ICON_COLOR,
  borderRadius: "4px",
  width: 34,
  height: 34,
  padding: "1px",
} as const;

type ProjectsTableProps = {
  projects: ReductionProjectSummary[];
  onEdit?: (project: ReductionProjectSummary) => void;
  onView?: (project: ReductionProjectSummary) => void;
  onCopy?: (project: ReductionProjectSummary) => void;
  onDelete?: (project: ReductionProjectSummary) => void;
  onDownload?: (project: ReductionProjectSummary) => void;
};

const formatDate = (isoDate: string | null): string => {
  if (!isoDate) return "-";
  return new Date(isoDate).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const ProjectsTable: FC<ProjectsTableProps> = ({
  projects,
  onEdit,
  onView,
  onCopy,
  onDelete,
  onDownload,
}) => {
  return (
    <TableContainer component={Box} sx={tableContainerSx}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ ...headerCellSx, width: "35%" }}>
              Nombre Proyecto
            </TableCell>
            <TableCell sx={{ ...headerCellSx, textAlign: "center" }}>
              Año Reducción
            </TableCell>
            <TableCell sx={{ ...headerCellSx, textAlign: "center" }}>
              Primer Reporte
            </TableCell>
            <TableCell sx={{ ...headerCellSx, textAlign: "center" }}>
              Reducción (tCO₂e)
            </TableCell>
            <TableCell sx={{ ...headerCellSx, textAlign: "center" }}>
              Estado
            </TableCell>
            <TableCell sx={headerCellSx}>
              Acciones
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id}>
              <TableCell sx={bodyCellSx}>{project.name}</TableCell>
              <TableCell sx={{ ...bodyCellSx, textAlign: "center" }}>
                {project.reportYears.length > 0
                  ? project.reportYears.join(", ")
                  : "-"}
              </TableCell>
              <TableCell sx={{ ...bodyCellSx, textAlign: "center" }}>
                {formatDate(project.firstReportDate)}
              </TableCell>
              <TableCell sx={{ ...bodyCellSx, textAlign: "center" }}>
                {project.totalReduction > 0
                  ? project.totalReduction.toFixed(2)
                  : "-"}
              </TableCell>
              <TableCell sx={{ ...bodyCellSx, textAlign: "center" }}>
                {(() => {
                  const cfg = getStatusConfig(project.status);
                  return (
                    <Chip
                      label={cfg.label}
                      size="small"
                      sx={{
                        backgroundColor: cfg.bgColor,
                        color: cfg.textColor,
                        fontWeight: 500,
                        fontSize: "0.75rem",
                        borderRadius: "14px",
                        border: `1px solid ${cfg.bgColor}`,
                      }}
                    />
                  );
                })()}
              </TableCell>
              <TableCell sx={bodyCellSx}>
                <Box className="flex items-center gap-2">
                  {/* DRAFT: Editar */}
                  {project.status === "DRAFT" && (
                    <Tooltip title="Editar proyecto">
                      <IconButton
                        size="small"
                        aria-label="Editar proyecto"
                        onClick={() => onEdit?.(project)}
                        sx={actionBtnSx}
                      >
                        <Edit sx={{ fontSize: 16, color: ICON_COLOR }} />
                      </IconButton>
                    </Tooltip>
                  )}

                  {/* IN_REVIEW: Ver */}
                  {project.status === "IN_REVIEW" && (
                    <Tooltip title="Ver proyecto">
                      <IconButton
                        size="small"
                        aria-label="Ver proyecto"
                        onClick={() => onView?.(project)}
                        sx={actionBtnSx}
                      >
                        <Visibility sx={{ fontSize: 16, color: ICON_COLOR }} />
                      </IconButton>
                    </Tooltip>
                  )}

                  {/* APPROVED: Ver + Copiar */}
                  {project.status === "APPROVED" && (
                    <>
                      <Tooltip title="Ver proyecto">
                        <IconButton
                          size="small"
                          aria-label="Ver proyecto"
                          onClick={() => onView?.(project)}
                          sx={actionBtnSx}
                        >
                          <Visibility sx={{ fontSize: 16, color: ICON_COLOR }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Copiar proyecto">
                        <IconButton
                          size="small"
                          aria-label="Copiar proyecto"
                          onClick={() => onCopy?.(project)}
                          sx={actionBtnSx}
                        >
                          <ContentCopy sx={{ fontSize: 16, color: ICON_COLOR }} />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}

                  {/* OBJECTED: Editar + Comentarios + Borrar */}
                  {project.status === "OBJECTED" && (
                    <>
                      <Tooltip title="Editar proyecto">
                        <IconButton
                          size="small"
                          aria-label="Editar proyecto"
                          onClick={() => onEdit?.(project)}
                          sx={actionBtnSx}
                        >
                          <Edit sx={{ fontSize: 16, color: ICON_COLOR }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Comentarios">
                        <IconButton
                          size="small"
                          aria-label="Comentarios"
                          sx={actionBtnSx}
                        >
                          <ChatBubbleOutline sx={{ fontSize: 16, color: ICON_COLOR }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Borrar proyecto">
                        <IconButton
                          size="small"
                          aria-label="Borrar proyecto"
                          onClick={() => onDelete?.(project)}
                          sx={actionBtnSx}
                        >
                          <Delete sx={{ fontSize: 16, color: ICON_COLOR }} />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}

                  {/* Download (siempre visible) */}
                  <Tooltip title="Descargar">
                    <IconButton
                      size="small"
                      onClick={() => onDownload?.(project)}
                      sx={actionBtnSx}
                    >
                      <Download sx={{ fontSize: 16, color: ICON_COLOR }} />
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

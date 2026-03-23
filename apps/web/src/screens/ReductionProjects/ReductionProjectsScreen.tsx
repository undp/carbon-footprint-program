import { FC, useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import { MainLayout } from "@/components/layout";
import { PageHeader, ProjectsTable } from "./components";
import {
  useReductionProjects,
  useOrganizations,
  useCopyReductionProject,
  useDeleteReductionProject,
} from "@/api/query";
import { reductionProjectKeys } from "@/api/query/reductionProjects/keys";
import { apiClient } from "@/api/http";
import type { GetReductionProjectByIdResponse } from "@repo/types";
import { exportReductionProjectToExcel } from "@/utils/exports";
import type { ReductionProjectSummary, Branch } from "./types";
import { Routes } from "@/interfaces";

export const ReductionProjectsScreen: FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: organizations } = useOrganizations();
  const copyProject = useCopyReductionProject();
  const deleteProject = useDeleteReductionProject();
  const [deleteDialogProject, setDeleteDialogProject] =
    useState<ReductionProjectSummary | null>(null);

  const branches: Branch[] = useMemo(() => {
    if (!organizations?.length) return [];
    return organizations.map((org) => ({ id: org.id, name: org.name }));
  }, [organizations]);

  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedYear, setSelectedYear] = useState("all");
  const organizationId = selectedBranch || organizations?.[0]?.id;

  const { data: projects, isLoading: isLoadingProjects } =
    useReductionProjects({
      organizationId: organizationId ?? "",
    });

  const availableYears = useMemo(() => {
    if (!projects?.length) return [];
    const years = [...new Set(projects.flatMap((p) => p.reportYears))];
    return years.sort((a, b) => b - a).map(String);
  }, [projects]);

  const yearFiltered = useMemo(() => {
    if (!projects) return [];
    if (!selectedYear || selectedYear === "all") return projects;
    return projects.filter((p) => p.reportYears.includes(Number(selectedYear)));
  }, [projects, selectedYear]);

  const handleEditProject = (project: ReductionProjectSummary) => {
    navigate({
      to: Routes.ADD_REDUCTION_PROJECT,
      search: { orgId: project.organizationId, projectId: project.id },
    });
  };

  const handleViewProject = (project: ReductionProjectSummary) => {
    navigate({
      to: Routes.ADD_REDUCTION_PROJECT,
      search: {
        orgId: project.organizationId,
        projectId: project.id,
        viewOnly: true,
      },
    });
  };

  const handleCopyProject = async (project: ReductionProjectSummary) => {
    await copyProject.mutateAsync(project.id);
  };

  const handleDeleteProject = (project: ReductionProjectSummary) => {
    setDeleteDialogProject(project);
  };

  const confirmDelete = async () => {
    if (!deleteDialogProject) return;
    await deleteProject.mutateAsync(deleteDialogProject.id);
    setDeleteDialogProject(null);
  };

  const handleDownloadProject = async (project: ReductionProjectSummary) => {
    const detail = await queryClient.fetchQuery<GetReductionProjectByIdResponse>({
      queryKey: reductionProjectKeys.detail(project.id),
      queryFn: () =>
        apiClient.get(`reduction-projects/${project.id}`).json(),
    });
    exportReductionProjectToExcel(detail);
  };

  const handleAddProject = () => {
    navigate({
      to: Routes.ADD_REDUCTION_PROJECT,
      search: { orgId: organizationId },
    });
  };

  const isDeleting = deleteProject.isPending;

  return (
    <MainLayout>
      <Box className="flex flex-1 flex-col gap-6 p-6">
        <PageHeader
          organizationName={branches.find((b) => b.id === organizationId)?.name ?? ""}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          years={availableYears}
          selectedBranch={organizationId ?? ""}
          onBranchChange={setSelectedBranch}
          branches={branches}
        />

        <Box className="flex flex-col gap-4 rounded-lg bg-white p-4">
          <Box className="flex items-center justify-between">
            <Box className="flex items-center gap-1">
              <Typography
                variant="body1"
                sx={{ color: "text.primary", fontSize: "1.125rem" }}
              >
                Proyectos de reduccion
              </Typography>
              <IconButton size="small">
                <InfoOutlined sx={{ fontSize: 20, color: "primary.main" }} />
              </IconButton>
            </Box>

            <Button
              variant="contained"
              color="primary"
              onClick={handleAddProject}
              sx={{
                textTransform: "uppercase",
                fontSize: "0.75rem",
                fontWeight: 500,
              }}
            >
              Ingresar proyecto de reduccion
            </Button>
          </Box>

          {isLoadingProjects ? (
            <Box className="flex justify-center py-8">
              <CircularProgress />
            </Box>
          ) : (
            <ProjectsTable
              projects={yearFiltered}
              onEdit={handleEditProject}
              onView={handleViewProject}
              onCopy={handleCopyProject}
              onDelete={handleDeleteProject}
              onDownload={handleDownloadProject}
            />
          )}
        </Box>
      </Box>
      <Dialog
        open={!!deleteDialogProject}
        onClose={() => setDeleteDialogProject(null)}
      >
        <DialogTitle>Eliminar proyecto</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro que deseas eliminar el proyecto &quot;
            {deleteDialogProject?.name}&quot;? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogProject(null)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

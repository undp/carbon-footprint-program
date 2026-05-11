import { FC, useCallback, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { useExplanations, useUpdateExplanation } from "@/api/query/maintainer";
import type { GetAllExplanationsResponse } from "@repo/types";
import { MaintainerPageHeader } from "../layout/MaintainerPageHeader";
import { MaintainerDataGrid } from "../components/MaintainerDataGrid";
import { ExplanationModal } from "../components/ExplanationModal";
import { useExplanationColumns } from "../hooks/useExplanationColumns";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

type ExplanationRow = GetAllExplanationsResponse[number];

const EXPLANATIONS_MAINTAINER_EXPLANATION_SLUGS = {
  MAIN: "explanations-maintainer",
} as const;

export const ExplanationsMaintainerScreen: FC = () => {
  const { data, isLoading, isError } = useExplanations();
  const updateMutation = useUpdateExplanation();
  const { enqueueSnackbar } = useSnackbar();

  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  const editingRow = useMemo(
    () => data?.find((row) => row.slug === editingSlug) ?? null,
    [data, editingSlug]
  );

  const rows = useMemo<ExplanationRow[]>(() => data ?? [], [data]);

  const handleOpenEdit = useCallback((slug: string) => {
    setEditingSlug(slug);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditingSlug(null);
  }, []);

  const handleSave = useCallback(
    async (content: string) => {
      if (!editingSlug) return;
      try {
        await updateMutation.mutateAsync({
          slug: editingSlug,
          content,
        });
        enqueueSnackbar("Explicación guardada", { variant: "success" });
      } catch (error) {
        enqueueSnackbar(
          getApiErrorMessage(error, "Error al guardar la explicación"),
          { variant: "error" }
        );
        throw error;
      }
    },
    [editingSlug, updateMutation, enqueueSnackbar]
  );

  const columns = useExplanationColumns({ onEdit: handleOpenEdit });

  return (
    <>
      <MaintainerPageHeader
        title="Explicaciones"
        explanationSlug={EXPLANATIONS_MAINTAINER_EXPLANATION_SLUGS.MAIN}
      />
      <Box className="rounded-sm bg-white p-3">
        {isError ? (
          <Typography variant="body2" color="error" sx={{ p: 2 }}>
            No fue posible cargar las explicaciones.
          </Typography>
        ) : (
          <MaintainerDataGrid
            editingRowId={null}
            searchable={{
              fuseOptions: {
                keys: ["name", "description"],
              },
              placeholder: "Buscar explicación...",
              downloadFileName: "explicaciones",
            }}
            loading={isLoading}
            columns={columns}
            rows={rows}
            getRowId={(row: ExplanationRow) => row.slug}
            disableRowSelectionOnClick
            showToolbar
            disableColumnSorting={false}
            disableColumnFilter={false}
            disableColumnMenu={false}
            hideFooter={false}
            pagination
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
              sorting: { sortModel: [{ field: "name", sort: "asc" }] },
            }}
          />
        )}
      </Box>
      <ExplanationModal
        open={editingRow !== null}
        value={editingRow?.content ?? ""}
        title={editingRow?.name}
        subtitle={
          editingRow?.description ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {editingRow.description}
            </Typography>
          ) : undefined
        }
        loading={updateMutation.isPending}
        onSave={handleSave}
        onClose={handleCloseEdit}
      />
    </>
  );
};

import { FC, useCallback, useMemo, useState } from "react";
import { Box, InputAdornment, TextField, Typography } from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { useExplanations, useUpdateExplanation } from "@/api/query/maintainer";
import type { GetAllExplanationsResponse } from "@repo/types";
import { useFuzzySearch } from "@/hooks";
import { MaintainerPageHeader } from "../layout/MaintainerPageHeader";
import { MaintainerDataGrid } from "../components/MaintainerDataGrid";
import { ExplanationModal } from "../components/ExplanationModal";
import { useExplanationColumns } from "../hooks/useExplanationColumns";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

type ExplanationRow = GetAllExplanationsResponse[number];

const EXPLANATION_FUSE_OPTIONS = {
  keys: ["name", "slug"],
};

export const ExplanationsMaintainerScreen: FC = () => {
  const { data, isLoading, isError } = useExplanations();
  const updateMutation = useUpdateExplanation();
  const { enqueueSnackbar } = useSnackbar();

  const [searchText, setSearchText] = useState("");
  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  const editingRow = useMemo(
    () => data?.find((row) => row.slug === editingSlug) ?? null,
    [data, editingSlug]
  );

  const rows = useMemo<ExplanationRow[]>(() => data ?? [], [data]);
  const { results: filteredRows } = useFuzzySearch(rows, {
    query: searchText,
    fuseOptions: EXPLANATION_FUSE_OPTIONS,
  });

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
        await updateMutation.mutateAsync({ slug: editingSlug, content });
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
        extra={
          <TextField
            size="small"
            label="Buscar"
            placeholder="Buscar por nombre o slug"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ minWidth: 280 }}
          />
        }
      />
      <Box className="rounded-sm bg-white p-3">
        {isError ? (
          <Typography variant="body2" color="error" sx={{ p: 2 }}>
            No fue posible cargar las explicaciones.
          </Typography>
        ) : (
          <MaintainerDataGrid
            editingRowId={null}
            loading={isLoading}
            columns={columns}
            rows={filteredRows}
            getRowId={(row: ExplanationRow) => row.slug}
            disableRowSelectionOnClick
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

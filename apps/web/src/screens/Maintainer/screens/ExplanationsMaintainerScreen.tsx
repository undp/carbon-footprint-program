import { FC, useCallback, useMemo, useState } from "react";
import {
  Box,
  Button,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { useSnackbar } from "notistack";
import { useExplanations, useUpdateExplanation } from "@/api/query/maintainer";
import type { GetAllExplanationsResponse } from "@repo/types";
import type { ExplanationSlug } from "@repo/constants";
import { MaintainerPageHeader } from "../layout/MaintainerPageHeader";
import { MaintainerDataGrid } from "../components/MaintainerDataGrid";
import { ExplanationModal } from "../components/ExplanationModal";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

type ExplanationRow = GetAllExplanationsResponse[number];

const normalize = (value: string): string =>
  value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

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

  const filteredRows = useMemo<ExplanationRow[]>(() => {
    if (!data) return [];
    if (!searchText.trim()) return data;
    const term = normalize(searchText.trim());
    return data.filter(
      (row) =>
        normalize(row.name).includes(term) || normalize(row.slug).includes(term)
    );
  }, [data, searchText]);

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
          slug: editingSlug as ExplanationSlug,
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

  const columns = useMemo<GridColDef<ExplanationRow>[]>(
    () => [
      {
        field: "name",
        headerName: "Nombre",
        flex: 1,
        minWidth: 220,
        sortable: false,
      },
      {
        field: "description",
        headerName: "Descripción",
        flex: 1.5,
        minWidth: 280,
        sortable: false,
        renderCell: (params: GridRenderCellParams<ExplanationRow>) => (
          <Typography variant="body2" color="text.secondary" component="span">
            {params.row.description ?? "—"}
          </Typography>
        ),
      },
      {
        field: "slug",
        headerName: "Slug",
        flex: 1,
        minWidth: 240,
        sortable: false,
        renderCell: (params: GridRenderCellParams<ExplanationRow>) => (
          <Typography
            variant="body2"
            sx={{ fontFamily: "monospace" }}
            component="span"
          >
            {params.row.slug}
          </Typography>
        ),
      },
      {
        field: "actions",
        headerName: "Acciones",
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        width: 140,
        renderCell: (params: GridRenderCellParams<ExplanationRow>) => (
          <Button
            size="small"
            variant="outlined"
            aria-label={`Editar explicación ${params.row.name}`}
            onClick={() => handleOpenEdit(params.row.slug)}
          >
            Editar
          </Button>
        ),
      },
    ],
    [handleOpenEdit]
  );

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

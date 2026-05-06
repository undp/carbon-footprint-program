import { FC, useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Checkbox,
  Tooltip,
  IconButton,
  Box,
  Typography,
  InputAdornment,
} from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import { ClearRounded, Close, SearchRounded } from "@mui/icons-material";
import { Controller } from "react-hook-form";
import { StylizedDataGrid } from "@/components/StylizedDataGrid";
import { CategoryChip } from "@/components/EmissionResults/CategoryChip";
import { LoadingErrorStateMessage } from "./LoadingErrorStateMessage";
import { useSubcategoryPreselectionData } from "../hooks/useSubcategoryPreselectionData";
import { useSubcategoryPreselectionForm } from "../hooks/useSubcategoryPreselectionForm";
import { useSubcategoryPreselectionSubmit } from "../hooks/useSubcategoryPreselectionSubmit";
import { SubcategoryPreselectionMergedData } from "../types";

type SubcategoryRow = {
  category: SubcategoryPreselectionMergedData[number];
  subcategory: SubcategoryPreselectionMergedData[number]["subcategories"][number];
};

interface AddSubcategoryModalProps {
  open: boolean;
  onClose: () => void;
  inventoryId: string;
}

export const AddSubcategoryModal: FC<AddSubcategoryModalProps> = ({
  open,
  onClose,
  inventoryId,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: categories,
    isLoading,
    hasError,
  } = useSubcategoryPreselectionData(inventoryId);

  const { handleSubmit, formState, control, reset } =
    useSubcategoryPreselectionForm({
      data: categories,
    });

  const handleClose = useCallback(() => {
    reset();
    setSearchTerm("");
    onClose();
  }, [onClose, reset]);

  const isDirty = formState.isDirty;

  const { saveSelections, isSavingSelections } =
    useSubcategoryPreselectionSubmit(inventoryId, { onSuccess: handleClose });

  const handleSave = useCallback(() => {
    void handleSubmit((values) => saveSelections(values, isDirty))();
  }, [handleSubmit, saveSelections, isDirty]);

  const rows = useMemo(
    () =>
      categories.flatMap((category) =>
        category.subcategories.map((subcategory) => ({ category, subcategory }))
      ),
    [categories]
  );

  // TODO: Implement fuzzy search
  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      ({ category, subcategory }) =>
        category.name.toLowerCase().includes(term) ||
        (category.synonyms?.toLowerCase().includes(term) ?? false) ||
        subcategory.name.toLowerCase().includes(term) ||
        (subcategory.description?.toLowerCase().includes(term) ?? false)
    );
  }, [rows, searchTerm]);

  const columns: GridColDef<SubcategoryRow>[] = useMemo(
    () => [
      {
        field: "category",
        headerName: "Categoría/Alcance",
        width: 180,
        renderCell: ({ row }) => (
          <Box className="flex h-full w-full items-center">
            <Box className="flex w-full flex-col">
              {row.category.synonyms && (
                <Tooltip title={row.category.synonyms} placement="top">
                  <span>
                    <CategoryChip
                      label={row.category.synonyms}
                      categoryColor={row.category.color}
                      sx={{
                        fontSize: 8,
                        height: 16,
                        borderRadius: 8,
                      }}
                    />
                  </span>
                </Tooltip>
              )}
              <Typography variant="body2">{row.category.name}</Typography>
            </Box>
          </Box>
        ),
      },
      {
        field: "subcategoryName",
        headerName: "Sub-categoría",
        width: 220,
        renderCell: ({ row }) => (
          <Box className="flex h-full w-full items-center">
            <Typography variant="body2">{row.subcategory.name}</Typography>
          </Box>
        ),
      },
      {
        field: "description",
        headerName: "Descripción",
        flex: 1,
        renderCell: ({ row }) => (
          <Box className="flex h-full w-full items-center">
            <Typography variant="body2" color="text.secondary">
              {row.subcategory.description}
            </Typography>
          </Box>
        ),
      },
      {
        field: "select",
        headerName: "Incluída",
        width: 80,
        align: "center",
        headerAlign: "center",
        renderCell: ({ row }) => (
          <Tooltip
            title={
              row.subcategory.edited
                ? "No se puede quitar porque tiene emisiones registradas"
                : ""
            }
            placement="left"
          >
            <span>
              <Controller
                control={control}
                name={row.subcategory.id}
                render={({ field }) => (
                  <Checkbox
                    checked={!!field.value}
                    disabled={row.subcategory.edited}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                )}
              />
            </span>
          </Tooltip>
        ),
      },
    ],
    [control]
  );

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (
          isSavingSelections &&
          (reason === "backdropClick" || reason === "escapeKeyDown")
        ) {
          return;
        }
        handleClose();
      }}
      fullWidth
      maxWidth="xl"
      slotProps={{ paper: { sx: { height: "700px" } } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
        }}
      >
        <Typography variant="h6" component="span">
          Agregar Subcategorías
        </Typography>
        <IconButton
          aria-label="Cerrar Modal"
          onClick={handleClose}
          size="small"
          disabled={isSavingSelections}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
          overflow: "hidden",
        }}
      >
        <TextField
          fullWidth
          size="small"
          label="Búsqueda"
          placeholder="Busca por alcance, categoría, actividad o palabra clave"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  {searchTerm ? (
                    <IconButton
                      size="small"
                      aria-label="Borrar búsqueda"
                      edge="end"
                      onClick={() => setSearchTerm("")}
                    >
                      <ClearRounded fontSize="small" />
                    </IconButton>
                  ) : (
                    <SearchRounded fontSize="small" />
                  )}
                </InputAdornment>
              ),
            },
          }}
        />

        {!isLoading && hasError && (
          <LoadingErrorStateMessage message="Ocurrió un error al cargar las subcategorías" />
        )}
        {!hasError && (
          <StylizedDataGrid
            columns={columns}
            rows={filteredRows}
            getRowId={(row: SubcategoryRow) => row.subcategory.id}
            loading={isLoading}
            localeText={{ noRowsLabel: "No se encontraron subcategorías" }}
            sx={{ flex: 1 }}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          variant="text"
          onClick={handleClose}
          disabled={isSavingSelections}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          loading={isSavingSelections || isLoading || hasError}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

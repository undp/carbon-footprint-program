import { FC, useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Checkbox,
  Chip,
  Tooltip,
  IconButton,
  Box,
  Typography,
  InputAdornment,
} from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import { Close, SearchRounded } from "@mui/icons-material";
import { Controller } from "react-hook-form";
import { StylizedDataGrid } from "@/components/StylizedDataGrid";
import { useSubcategoryPreselectionData } from "../../hooks/useSubcategoryPreselectionData";
import { useSubcategoryPreselectionForm } from "../../hooks/useSubcategoryPreselectionForm";
import { useSubcategoryPreselectionSubmit } from "../../hooks/useSubcategoryPreselectionSubmit";
import { SubcategoryPreselectionMergedData } from "../../types";

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

  const { data: categories, isLoading } =
    useSubcategoryPreselectionData(inventoryId);

  const { handleSubmit, formState, control } = useSubcategoryPreselectionForm({
    data: categories,
  });

  const isDirty = formState.isDirty;

  const { saveSelections, isSavingSelections } =
    useSubcategoryPreselectionSubmit(inventoryId, { onSuccess: onClose });

  const rows = useMemo(
    () =>
      categories.flatMap((category) =>
        category.subcategories.map((subcategory) => ({ category, subcategory }))
      ),
    [categories]
  );

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
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {row.category.synonyms && (
              <Chip
                label={row.category.synonyms}
                size="small"
                sx={{
                  fontSize: 10,
                  height: 20,
                  bgcolor: `${row.category.color}4D`,
                  color: row.category.color,
                  fontWeight: 600,
                  alignSelf: "flex-start",
                  maxWidth: "100%",
                }}
              />
            )}
            <Typography variant="body2">{row.category.name}</Typography>
          </Box>
        ),
      },
      {
        field: "subcategoryName",
        headerName: "Sub-categoría",
        width: 220,
        renderCell: ({ row }) => (
          <Typography variant="body2">{row.subcategory.name}</Typography>
        ),
      },
      {
        field: "description",
        headerName: "Descripción",
        flex: 1,
        renderCell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {row.subcategory.description}
          </Typography>
        ),
      },
      {
        field: "select",
        headerName: "Agregar",
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

  const handleSave = useCallback(() => {
    void handleSubmit((values) => saveSelections(values, isDirty))();
  }, [handleSubmit, saveSelections, isDirty]);

  const handleClose = useCallback(() => {
    setSearchTerm("");
    onClose();
  }, [onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="lg"
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
          Agregar Subcategoría
        </Typography>
        <IconButton
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
                  <SearchRounded fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />

        <StylizedDataGrid
          columns={columns}
          rows={filteredRows}
          getRowId={(row: SubcategoryRow) => row.subcategory.id}
          loading={isLoading}
          localeText={{ noRowsLabel: "No se encontraron subcategorías" }}
          sx={{ flex: 1 }}
        />
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
          loading={isSavingSelections}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

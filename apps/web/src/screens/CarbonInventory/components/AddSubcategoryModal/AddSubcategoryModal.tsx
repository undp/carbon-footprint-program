import { FC, useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  Chip,
  Tooltip,
  IconButton,
  Box,
  Typography,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import { Close, SearchRounded } from "@mui/icons-material";
import { Controller } from "react-hook-form";
import { useSubcategoryPreselectionData } from "../../hooks/useSubcategoryPreselectionData";
import { useSubcategoryPreselectionForm } from "../../hooks/useSubcategoryPreselectionForm";
import { useSubcategoryPreselectionSubmit } from "../../hooks/useSubcategoryPreselectionSubmit";

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

        {isLoading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flex: 1,
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box
            sx={{
              overflow: "auto",
              flex: 1,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 180 }}>Categoría/Alcance</TableCell>
                  <TableCell sx={{ width: 220 }}>Sub-categoría</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell sx={{ width: 80, textAlign: "center" }}>
                    Agregar
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.map(({ category, subcategory }) => (
                  <TableRow key={subcategory.id} hover>
                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.5,
                        }}
                      >
                        {category.synonyms && (
                          <Chip
                            label={category.synonyms}
                            size="small"
                            sx={{
                              fontSize: 10,
                              height: 20,
                              bgcolor: `${category.color}4D`,
                              color: category.color,
                              fontWeight: 600,
                              alignSelf: "flex-start",
                              maxWidth: "100%",
                            }}
                          />
                        )}
                        <Typography variant="body2">{category.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {subcategory.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {subcategory.description}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip
                        title={
                          subcategory.edited
                            ? "No se puede quitar porque tiene emisiones registradas"
                            : ""
                        }
                        placement="left"
                      >
                        <span>
                          <Controller
                            control={control}
                            name={subcategory.id}
                            render={({ field }) => (
                              <Checkbox
                                checked={!!field.value}
                                disabled={subcategory.edited}
                                onChange={(e) =>
                                  field.onChange(e.target.checked)
                                }
                              />
                            )}
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ py: 2 }}
                      >
                        No se encontraron subcategorías
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
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
          loading={isSavingSelections}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

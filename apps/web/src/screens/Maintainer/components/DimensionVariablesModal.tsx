import { FC, useState, useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { AddCircleOutline, DeleteOutlined } from "@mui/icons-material";

interface DimensionVariable {
  id: string;
  value: string;
  inUse?: boolean;
}

interface DimensionVariablesModalProps {
  open: boolean;
  readOnly?: boolean;
  subcategoryHasEmissionFactors?: boolean;
  dimensionName: string;
  variables: DimensionVariable[];
  onSave: (variables: DimensionVariable[]) => void;
  onClose: () => void;
}

const DimensionVariablesModalContent: FC<
  Omit<DimensionVariablesModalProps, "open">
> = ({
  readOnly = false,
  subcategoryHasEmissionFactors = false,
  dimensionName,
  variables,
  onSave,
  onClose,
}) => {
  const [localVars, setLocalVars] = useState<DimensionVariable[]>(() =>
    variables.length > 0
      ? variables.map((v) => ({ ...v }))
      : [{ id: `new_${Date.now()}`, value: "" }]
  );
  const duplicateIndices = useMemo(() => {
    const seen = new Map<string, number>();
    const dupes = new Set<number>();
    localVars.forEach((v, i) => {
      const key = v.value.trim().toLowerCase();
      if (key === "") return;
      if (seen.has(key)) {
        dupes.add(seen.get(key)!);
        dupes.add(i);
      } else {
        seen.set(key, i);
      }
    });
    return dupes;
  }, [localVars]);

  const hasEmptyValues = localVars.some((v) => v.value.trim() === "");
  const hasDuplicates = duplicateIndices.size > 0;
  const canClose = !hasDuplicates && !hasEmptyValues && localVars.length > 0;

  const handleAdd = () => {
    setLocalVars((prev) => [...prev, { id: `new_${Date.now()}`, value: "" }]);
  };

  const handleRemove = (index: number) => {
    setLocalVars((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, value: string) => {
    setLocalVars((prev) =>
      prev.map((v, i) => (i === index ? { ...v, value } : v))
    );
  };

  const handleSaveAndClose = () => {
    if (!canClose) return;
    onSave(localVars);
    onClose();
  };

  return (
    <>
      <DialogTitle>Configurar Variables — {dimensionName}</DialogTitle>
      <DialogContent>
        {subcategoryHasEmissionFactors && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Esta dimensión tiene factores de emisión activos. Puedes agregar
            nuevas variables y renombrar las existentes, pero no eliminarlas.
          </Alert>
        )}

        {localVars.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No hay variables configuradas. Agrega al menos una variable.
          </Typography>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {localVars.map((v, i) => {
            const isExisting = !v.id.startsWith("new_");
            const removeBlocked = subcategoryHasEmissionFactors && isExisting;
            return (
              <Box
                key={v.id}
                sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}
              >
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Nombre de variable"
                  value={v.value}
                  onChange={(e) => handleChange(i, e.target.value)}
                  disabled={readOnly}
                  autoFocus={v.id.startsWith("new_")}
                  error={duplicateIndices.has(i) || v.value.trim() === ""}
                  helperText={
                    duplicateIndices.has(i)
                      ? "Nombre duplicado"
                      : v.value.trim() === ""
                        ? "Nombre es requerido"
                        : undefined
                  }
                />
                {!readOnly && (
                  <Tooltip
                    title={
                      removeBlocked
                        ? "No se puede eliminar: existen factores de emisión activos"
                        : "Eliminar variable"
                    }
                  >
                    <span>
                      <IconButton
                        size="small"
                        sx={{ mt: "4px" }}
                        onClick={() => handleRemove(i)}
                        disabled={removeBlocked}
                      >
                        <DeleteOutlined fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </Box>
            );
          })}
        </Box>

        {!readOnly && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Tooltip title="Agregar variable">
              <IconButton onClick={handleAdd} color="primary">
                <AddCircleOutline />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {readOnly ? (
          <Button onClick={onClose}>Cerrar</Button>
        ) : (
          <Tooltip
            title={
              !canClose
                ? hasDuplicates
                  ? "Hay nombres duplicados"
                  : hasEmptyValues
                    ? "Hay variables sin nombre"
                    : "Debe tener al menos una variable"
                : ""
            }
          >
            <span>
              <Button
                variant="contained"
                onClick={handleSaveAndClose}
                disabled={!canClose}
              >
                Guardar
              </Button>
            </span>
          </Tooltip>
        )}
      </DialogActions>
    </>
  );
};

export const DimensionVariablesModal: FC<DimensionVariablesModalProps> = ({
  open,
  ...contentProps
}) => (
  <Dialog open={open} onClose={contentProps.onClose} maxWidth="sm" fullWidth>
    {open && <DimensionVariablesModalContent {...contentProps} />}
  </Dialog>
);

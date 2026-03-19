import { FC, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Info, ClearOutlined } from "@mui/icons-material";

interface DimensionConfig {
  code: string;
  name: string;
  position: number; // 1 or 2
  isRequired: boolean;
}

interface VariableConfigModalProps {
  open: boolean;
  readOnly?: boolean;
  hasEmissionFactors?: boolean;
  subcategoryId: string;
  subcategoryName: string;
  currentDimensions: DimensionConfig[];
  onSave: (subcategoryId: string, dimensions: DimensionConfig[]) => void;
  onClose: () => void;
}

function getDim(
  dims: DimensionConfig[],
  pos: number
): DimensionConfig | undefined {
  return dims.find((d) => d.position === pos);
}

const VariableConfigContent: FC<Omit<VariableConfigModalProps, "open">> = ({
  readOnly = false,
  hasEmissionFactors = false,
  subcategoryId,
  subcategoryName,
  currentDimensions,
  onSave,
  onClose,
}) => {
  const [dims, setDims] = useState<DimensionConfig[]>(() =>
    currentDimensions.map((d) => ({ ...d }))
  );

  const updateDim = (
    position: number,
    field: "name" | "isRequired",
    value: string | boolean
  ) => {
    setDims((prev) => {
      if (field === "name" && (value as string).trim() === "") {
        // When there are EFs, don't allow removing a dimension by clearing its name
        if (hasEmissionFactors) return prev;
        return prev.filter((d) => d.position < position);
      }
      const next = [...prev];
      let dim = next.find((d) => d.position === position);
      if (!dim) {
        // When there are EFs, don't allow creating new dimensions
        if (hasEmissionFactors) return prev;
        dim = {
          code: `variable_${position}`,
          name: "",
          position,
          isRequired: false,
        };
        next.push(dim);
      }
      const idx = next.indexOf(dim);
      next[idx] = { ...dim, [field]: value };
      return next;
    });
  };

  const handleSave = () => {
    const cleaned = dims.filter((d) => d.name.trim().length > 0);
    onSave(subcategoryId, cleaned);
    onClose();
  };

  const clearDim = (position: number) => {
    setDims((prev) => prev.filter((d) => d.position !== position));
  };

  const dim1 = getDim(dims, 1);
  const dim2 = getDim(dims, 2);
  const hasDim1 = !!dim1;
  const hasDim2 = !!dim2;
  const canClearDim1 = hasDim1 && !hasDim2;

  return (
    <>
      <DialogTitle>{`Configurar variables - ${subcategoryName}`}</DialogTitle>
      <DialogContent>
        {!readOnly && (
          <Box
            sx={{
              mb: 2,
              p: 1.5,
              borderRadius: 1,
              border: "1px solid",
              borderColor: "info.main",
              bgcolor: "info.lighter",
              display: "flex",
              gap: 1.5,
              alignItems: "flex-start",
            }}
          >
            <Info color="info" sx={{ mt: 0.25 }} />
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                <strong>Instrucciones:</strong> Define las variables de esta
                sub-categoría y si son requeridas.
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                component="ul"
                sx={{ pl: 2 }}
              >
                <li>
                  Solo puedes configurar la <strong>variable 2</strong> si ya
                  existe una <strong>variable 1</strong>
                </li>
                <li>
                  Una variable <strong>requerida</strong> afecta el cálculo del
                  factor de emisión
                </li>
                {hasEmissionFactors && (
                  <li>
                    Esta sub-categoría tiene factores de emisión asociados, solo
                    se puede modificar el <strong>nombre</strong> de las variables
                    existentes
                  </li>
                )}
              </Typography>
            </Box>
          </Box>
        )}

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                <TableCell sx={{ fontWeight: 600, width: "15%" }}>
                  Variable
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Nombre</TableCell>
                <TableCell
                  sx={{ fontWeight: 600, width: "20%" }}
                  align="center"
                >
                  Requerida
                </TableCell>
                {!readOnly && (
                  <TableCell
                    sx={{ fontWeight: 600, width: "10%" }}
                    align="center"
                  />
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Variable 1 */}
              <TableRow>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    1
                  </Typography>
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="ej: Tipo de vehículo"
                    value={dim1?.name ?? ""}
                    onChange={(e) => updateDim(1, "name", e.target.value)}
                    disabled={readOnly || (!hasDim1 && hasEmissionFactors)}
                  />
                </TableCell>
                <TableCell align="center">
                  {hasDim1 ? (
                    <Checkbox
                      checked={dim1?.isRequired ?? false}
                      onChange={(e) =>
                        updateDim(1, "isRequired", e.target.checked)
                      }
                      disabled={readOnly || hasEmissionFactors}
                      size="small"
                    />
                  ) : (
                    <Typography variant="caption" color="text.disabled">
                      &mdash;
                    </Typography>
                  )}
                </TableCell>
                {!readOnly && (
                  <TableCell align="center">
                    {hasDim1 && !hasEmissionFactors && (
                      <Tooltip
                        title={
                          !canClearDim1
                            ? "Primero debes limpiar la variable 2"
                            : "Limpiar variable"
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => clearDim(1)}
                            disabled={!canClearDim1}
                          >
                            <ClearOutlined fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </TableCell>
                )}
              </TableRow>

              {/* Variable 2 */}
              <TableRow>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    2
                  </Typography>
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="ej: Tipo de combustible"
                    value={dim2?.name ?? ""}
                    onChange={(e) => updateDim(2, "name", e.target.value)}
                    disabled={
                      readOnly ||
                      (!hasDim1 && !hasEmissionFactors) ||
                      (!hasDim2 && hasEmissionFactors)
                    }
                  />
                </TableCell>
                <TableCell align="center">
                  {hasDim2 ? (
                    <Checkbox
                      checked={dim2?.isRequired ?? false}
                      onChange={(e) =>
                        updateDim(2, "isRequired", e.target.checked)
                      }
                      disabled={readOnly || hasEmissionFactors}
                      size="small"
                    />
                  ) : (
                    <Typography variant="caption" color="text.disabled">
                      &mdash;
                    </Typography>
                  )}
                </TableCell>
                {!readOnly && (
                  <TableCell align="center">
                    {hasDim2 && !hasEmissionFactors && (
                      <Tooltip title="Limpiar variable">
                        <span>
                          <IconButton size="small" onClick={() => clearDim(2)}>
                            <ClearOutlined fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </TableCell>
                )}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{readOnly ? "Cerrar" : "Cancelar"}</Button>
        {!readOnly && (
          <Button variant="contained" color="primary" onClick={handleSave}>
            Guardar configuraci&oacute;n
          </Button>
        )}
      </DialogActions>
    </>
  );
};

export const VariableConfigModal: FC<VariableConfigModalProps> = ({
  open,
  ...contentProps
}) => (
  <Dialog open={open} onClose={contentProps.onClose} maxWidth="sm" fullWidth>
    {open && <VariableConfigContent {...contentProps} />}
  </Dialog>
);

import { FC, useState, useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Info as InfoIcon, Warning as WarningIcon } from "@mui/icons-material";
import type { z } from "zod";
import type { GasDetailsSchema } from "@repo/types";

type GasDetails = z.infer<typeof GasDetailsSchema>;

interface GEIBreakdownModalProps {
  open: boolean;
  gasDetails: GasDetails;
  declaredValue: string;
  readOnly?: boolean;
  onSave: (gasDetails: GasDetails) => void;
  onClose: () => void;
}

const GAS_FIELDS = [
  {
    key: "CO2_FOSSIL" as const,
    label: "CO\u2082 fósil",
    description: "Dióxido de carbono de origen fósil",
  },
  { key: "CH4" as const, label: "CH\u2084", description: "Metano" },
  { key: "N2O" as const, label: "N\u2082O", description: "Óxido nitroso" },
  { key: "HFC" as const, label: "HFC", description: "Hidrofluorocarbonos" },
  { key: "PFC" as const, label: "PFC", description: "Perfluorocarbonos" },
  {
    key: "SF6" as const,
    label: "SF\u2086",
    description: "Hexafluoruro de azufre",
  },
  {
    key: "NF3" as const,
    label: "NF\u2083",
    description: "Trifluoruro de nitrógeno",
  },
] as const;

const GEIBreakdownContent: FC<Omit<GEIBreakdownModalProps, "open">> = ({
  gasDetails,
  declaredValue,
  readOnly = false,
  onSave,
  onClose,
}) => {
  const [breakdown, setBreakdown] = useState<GasDetails>(gasDetails);

  const totalNum = useMemo(
    () => GAS_FIELDS.reduce((sum, { key }) => sum + (breakdown[key] ?? 0), 0),
    [breakdown]
  );
  const total = totalNum.toFixed(4);

  const hasBreakdown = totalNum > 0;
  const declaredNum = parseFloat(declaredValue) || 0;
  const mismatch =
    hasBreakdown && declaredNum > 0 && Math.abs(totalNum - declaredNum) > 1e-4;

  const handleChange = (key: keyof GasDetails, raw: string) => {
    const value = parseFloat(raw) || 0;
    setBreakdown((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(breakdown);
    onClose();
  };

  return (
    <>
      <DialogTitle>Desglose de Gases GEI</DialogTitle>
      <DialogContent>
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
          <InfoIcon color="info" sx={{ mt: 0.25 }} />
          <Typography variant="body2" color="text.secondary">
            Ingresa los valores de emisi&oacute;n de cada gas de efecto
            invernadero en <strong>kgCO&#8322;e</strong>. El total se
            calcular&aacute; autom&aacute;ticamente. Si un gas no aplica, deja
            el valor en 0.
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                <TableCell sx={{ fontWeight: 600 }}>Gas</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  Descripci&oacute;n
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  Valor (kgCO&#8322;e)
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {GAS_FIELDS.map(({ key, label, description }) => (
                <TableRow key={key}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {label}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {description}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      inputProps={{
                        step: "0.0001",
                        style: { textAlign: "right" },
                      }}
                      value={breakdown[key] ?? 0}
                      onChange={(e) => handleChange(key, e.target.value)}
                      disabled={readOnly}
                      sx={{ width: 140 }}
                    />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: "grey.100" }}>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>
                    Total tCO&#8322;e
                  </Typography>
                </TableCell>
                <TableCell>
                  {declaredNum > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Valor declarado:{" "}
                      <strong>{parseFloat(declaredValue).toFixed(4)}</strong>
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body1"
                    fontWeight={700}
                    fontFamily="monospace"
                    sx={{
                      bgcolor: mismatch ? "error.lighter" : "success.lighter",
                      color: mismatch ? "error.dark" : "success.dark",
                      px: 2,
                      py: 0.5,
                      borderRadius: 1,
                      display: "inline-block",
                    }}
                  >
                    {total}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        {mismatch && (
          <Alert severity="error" icon={<WarningIcon />} sx={{ mt: 2 }}>
            La suma del desglose ({total}) no coincide con el valor declarado (
            {parseFloat(declaredValue).toFixed(4)}). Ajusta los valores para
            poder guardar.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        {!readOnly && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={mismatch}
          >
            Guardar desglose
          </Button>
        )}
      </DialogActions>
    </>
  );
};

export const GEIBreakdownModal: FC<GEIBreakdownModalProps> = ({
  open,
  ...contentProps
}) => (
  <Dialog open={open} onClose={contentProps.onClose} maxWidth="md" fullWidth>
    {open && <GEIBreakdownContent {...contentProps} />}
  </Dialog>
);

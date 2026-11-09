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
  Typography,
} from "@mui/material";
import { Info as InfoIcon, Warning as WarningIcon } from "@mui/icons-material";
import type { z } from "zod";
import type { GasDetailsSchema } from "@repo/types";
import { NumericInput } from "@/components";
import { FACTOR_INPUT_DECIMAL_SCALE } from "@/config/constants";
import { GEI_FORMULAS, GEI_NAMES } from "@/labels/gei";
import { formatter } from "@/utils/formatting";

type GasDetails = z.infer<typeof GasDetailsSchema>;
/** While editing, an emptied field holds `null` so it shows empty, not `0`. */
type EditableGasDetails = Record<keyof GasDetails, number | null>;

interface GEIBreakdownModalProps {
  open: boolean;
  gasDetails: GasDetails;
  declaredValue: number;
  readOnly?: boolean;
  onSave: (gasDetails: GasDetails) => void;
  onClose: () => void;
}

/** Breakdown rows: fossil CO₂, then the other gases in the fixed GEI order. */
const GAS_FIELDS: {
  key: keyof GasDetails;
  label: string;
  description: string;
}[] = [
  {
    key: "CO2_FOSSIL",
    label: `${GEI_FORMULAS.CO2} fósil`,
    description: `${GEI_NAMES.CO2} de origen fósil`,
  },
  ...(["CH4", "N2O", "HFC", "PFC", "SF6", "NF3"] as const).map((key) => ({
    key,
    label: GEI_FORMULAS[key],
    description: GEI_NAMES[key],
  })),
];

const GEIBreakdownContent: FC<Omit<GEIBreakdownModalProps, "open">> = ({
  gasDetails,
  declaredValue,
  readOnly = false,
  onSave,
  onClose,
}) => {
  const [breakdown, setBreakdown] = useState<EditableGasDetails>(gasDetails);

  const totalNum = useMemo(
    () => GAS_FIELDS.reduce((sum, { key }) => sum + (breakdown[key] ?? 0), 0),
    [breakdown]
  );
  const total = formatter.exact(totalNum);
  const declared = formatter.exact(declaredValue);

  const hasBreakdown = totalNum > 0;
  const mismatch =
    hasBreakdown &&
    Number.isFinite(declaredValue) &&
    Math.abs(totalNum - declaredValue) > 1e-4;

  const handleChange = (key: keyof GasDetails, value: number | null) => {
    setBreakdown((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const saved = Object.fromEntries(
      GAS_FIELDS.map(({ key }) => [key, breakdown[key] ?? 0])
    ) as GasDetails;
    onSave(saved);
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
            Ingresa los valores de emisión de cada gas de efecto invernadero en{" "}
            <strong>kgCO&#8322;e</strong>. El total se calculará
            automáticamente. Si un gas no aplica, deja el valor en 0.
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                <TableCell sx={{ fontWeight: 600 }}>Gas</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Descripción</TableCell>
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
                    <NumericInput
                      value={breakdown[key]}
                      onChange={(value) => handleChange(key, value)}
                      min={0}
                      decimalScale={FACTOR_INPUT_DECIMAL_SCALE}
                      fullWidth={false}
                      disabled={readOnly}
                      sx={{ width: 140 }}
                    />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: "grey.100" }}>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>
                    Total kgCO&#8322;e
                  </Typography>
                </TableCell>
                <TableCell>
                  {declaredValue > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Valor declarado: <strong>{declared}</strong>
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
            {declared}). Ajusta los valores para poder guardar.
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

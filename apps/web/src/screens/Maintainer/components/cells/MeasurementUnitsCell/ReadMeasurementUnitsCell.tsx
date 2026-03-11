import { FC } from "react";
import { Box, Chip, Typography, alpha } from "@mui/material";
import type { MeasurementUnit } from "../../../types";

const MAX_VISIBLE_CHIPS = 6;

interface ReadMeasurementUnitsCellProps {
  selectedUnits: MeasurementUnit[];
  unitIds: string[];
  onChange: (unitIds: string[]) => void;
  onClick?: () => void;
  onOpenAndEdit: () => void;
}

export const ReadMeasurementUnitsCell: FC<ReadMeasurementUnitsCellProps> = ({
  selectedUnits,
  unitIds,
  onChange,
  onClick,
  onOpenAndEdit,
}) => {
  const visibleChips = selectedUnits.slice(0, MAX_VISIBLE_CHIPS);
  const remaining = selectedUnits.length - MAX_VISIBLE_CHIPS;

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 0.5,
        alignItems: "center",
        width: "100%",
        px: 0.5,
        py: 0.5,
        borderRadius: 1,
      }}
    >
      {visibleChips.map((unit) => (
        <Chip
          key={unit.id}
          label={unit.name}
          size="small"
          variant="outlined"
          color="primary"
          sx={{ backgroundColor: (t) => alpha(t.palette.primary.main, 0.1) }}
          onDelete={
            onClick
              ? () => onChange(unitIds.filter((id) => id !== unit.id))
              : undefined
          }
        />
      ))}
      {remaining > 0 && (
        <Chip
          label={`+${remaining}`}
          size="small"
          variant="outlined"
          color="primary"
          onClick={onOpenAndEdit}
          sx={{
            backgroundColor: (t) => alpha(t.palette.primary.main, 0.1),
            cursor: onClick ? "pointer" : "default",
          }}
        />
      )}
      {selectedUnits.length === 0 && !onClick && (
        <Typography variant="body2" color="text.secondary">
          —
        </Typography>
      )}
      {onClick && (
        <Chip
          label="+ Agregar"
          size="small"
          variant="outlined"
          onClick={onOpenAndEdit}
          sx={{
            borderStyle: "dashed",
            borderColor: "primary.main",
            color: "primary.main",
          }}
        />
      )}
    </Box>
  );
};

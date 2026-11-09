import { FC } from "react";
import { Alert } from "@mui/material";

interface Props {
  duplicatedCount: number;
  targetYear: number;
}

/** Counts the factors that would end duplicated; each is marked in its source cell. */
export const YearCopyDuplicateNotice: FC<Props> = ({
  duplicatedCount,
  targetYear,
}) => {
  if (duplicatedCount === 0) return null;
  return (
    <Alert severity="error" sx={{ mb: 2 }}>
      {duplicatedCount === 1
        ? "1 factor quedaría"
        : `${duplicatedCount} factores quedarían`}{" "}
      duplicado{duplicatedCount === 1 ? "" : "s"} en {targetYear}: misma
      sub-categoría, variables, unidad y fuente. Cambia la fuente de alguno o
      quítalo de la copia.
    </Alert>
  );
};

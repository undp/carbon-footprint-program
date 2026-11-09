import { FC } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { ContentCopyOutlined } from "@mui/icons-material";

export interface YearCopyCounts {
  copied: number;
  existing: number;
  excluded: number;
  newValues: number;
  newSources: number;
  warnings: number;
}

interface Props {
  counts: YearCopyCounts;
  targetYear: number;
  hasViolations: boolean;
  isCopying: boolean;
  onCopy: () => void;
}

const plural = (count: number, singular: string, pluralForm: string) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

export const YearCopyFooter: FC<Props> = ({
  counts,
  targetYear,
  hasViolations,
  isCopying,
  onCopy,
}) => (
  <Box
    className="flex flex-wrap items-center justify-between gap-3"
    sx={{ pt: 2 }}
  >
    <Box className="flex flex-col gap-0.5">
      <Typography variant="body2" color="text.secondary">
        No se copian: {plural(counts.existing, "ya existe", "ya existen")} ·{" "}
        {plural(counts.excluded, "quitado", "quitados")}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        De los que se copian: {counts.newValues} con valor nuevo ·{" "}
        {counts.newSources} con fuente nueva ·{" "}
        <Box
          component="span"
          sx={{ color: counts.warnings > 0 ? "warning.main" : undefined }}
        >
          {plural(counts.warnings, "alerta", "alertas")}
        </Box>
      </Typography>
    </Box>
    <Button
      variant="contained"
      startIcon={
        isCopying ? (
          <CircularProgress size={16} color="inherit" />
        ) : (
          <ContentCopyOutlined />
        )
      }
      disabled={hasViolations || counts.copied === 0 || isCopying}
      onClick={onCopy}
    >
      Copiar {plural(counts.copied, "factor", "factores")} a {targetYear}
    </Button>
  </Box>
);

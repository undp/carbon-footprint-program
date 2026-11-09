import { FC } from "react";
import { Box, Chip, Tooltip, Typography } from "@mui/material";
import { formatter } from "@/utils/formatting";
import {
  describeCopyValueVariation,
  formatCopyValueVariation,
  type YearCopyRow,
} from "../../utils/emissionFactorYearCopy";

interface Props {
  row: YearCopyRow;
  sourceYear: number;
  targetYear: number;
}

/** The source year's value, with how the copy's value moved from it. */
export const YearCopySourceValueCell: FC<Props> = ({
  row,
  sourceYear,
  targetYear,
}) => (
  <Box className="flex w-full items-center justify-end gap-1">
    <Typography variant="body2">{formatter.exact(row.storedValue)}</Typography>
    {row.variation && (
      <Tooltip
        arrow
        placement="top"
        title={describeCopyValueVariation(
          row.variation,
          sourceYear,
          targetYear
        )}
      >
        <Chip
          size="small"
          variant="outlined"
          color={row.variation.isWarning ? "warning" : "default"}
          label={formatCopyValueVariation(row.variation)}
        />
      </Tooltip>
    )}
  </Box>
);

import { FC, useState } from "react";
import {
  Autocomplete,
  Box,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { YearCopyOutcome } from "@repo/utils";
import { formatter } from "@/utils/formatting";
import type { YearCopyRow } from "../../utils/emissionFactorYearCopy";
import { reasonMessage, VALUE_REASONS } from "./yearCopyReasonMessages";

interface Props {
  row: YearCopyRow;
  targetYear: number;
  suggestions: readonly string[];
  onChange: (row: YearCopyRow, source: string) => void;
}

const SourceText: FC<{ text: string; struck?: boolean }> = ({
  text,
  struck,
}) => (
  <Typography
    variant="body2"
    noWrap
    title={text}
    sx={{
      px: 1,
      textDecoration: struck ? "line-through" : undefined,
      color: struck ? "text.disabled" : undefined,
    }}
  >
    {text}
  </Typography>
);

interface SourceInputProps {
  initialValue: string;
  suggestions: readonly string[];
  error?: string;
  changed: boolean;
  onCommit: (source: string) => void;
}

/** Remounted when the committed text changes, so it always starts from it. */
const SourceInput: FC<SourceInputProps> = ({
  initialValue,
  suggestions,
  error,
  changed,
  onCommit,
}) => {
  const [localValue, setLocalValue] = useState(initialValue);
  return (
    <Tooltip title={error ?? ""} arrow placement="top">
      <Autocomplete
        freeSolo
        fullWidth
        size="small"
        options={suggestions}
        value={localValue}
        onChange={(_, next) => setLocalValue(next ?? "")}
        onInputChange={(_, next) => setLocalValue(next)}
        onBlur={() => onCommit(localValue)}
        // Flex, so the inline-flex field sits on no line box and stays centered.
        sx={{ display: "flex" }}
        renderInput={(params) => (
          <TextField
            {...params}
            error={!!error}
            onKeyDown={(event) => event.stopPropagation()}
            slotProps={{
              htmlInput: {
                ...params.inputProps,
                "aria-label": "Fuente de destino",
              },
            }}
            sx={(theme) => ({
              "& .MuiOutlinedInput-root": {
                backgroundColor: changed
                  ? alpha(theme.palette.primary.main, 0.08)
                  : "white",
              },
              "& input": { fontWeight: changed ? 600 : undefined },
            })}
          />
        )}
      />
    </Tooltip>
  );
};

export const YearCopyTargetSourceCell: FC<Props> = ({
  row,
  targetYear,
  suggestions,
  onChange,
}) => {
  if (row.outcome === YearCopyOutcome.EXISTS_IN_TARGET) {
    if (row.targetFactors.length === 1) {
      return <SourceText text={row.targetFactors[0]?.source ?? ""} />;
    }
    return (
      <Tooltip
        arrow
        placement="top"
        title={
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {row.targetFactors.map((factor) => (
              <li key={factor.id}>
                {factor.source}: {formatter.exact(factor.value)}
              </li>
            ))}
          </Box>
        }
      >
        <Typography variant="body2" sx={{ px: 1, fontStyle: "italic" }}>
          {row.targetFactors.length} fuentes en {targetYear}
        </Typography>
      </Tooltip>
    );
  }
  if (row.outcome === YearCopyOutcome.EXCLUDED) {
    return <SourceText text={row.sourceInput} struck />;
  }

  return (
    <SourceInput
      key={row.sourceInput}
      initialValue={row.sourceInput}
      suggestions={suggestions}
      error={reasonMessage(
        row.reasons,
        (reason) => !VALUE_REASONS.includes(reason)
      )}
      changed={row.sourceChanged}
      onCommit={(source) => onChange(row, source)}
    />
  );
};

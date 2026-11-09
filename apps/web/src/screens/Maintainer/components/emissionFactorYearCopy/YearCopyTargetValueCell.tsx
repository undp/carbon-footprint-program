import { FC, useState } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { LockOutlined } from "@mui/icons-material";
import { YearCopyOutcome } from "@repo/utils";
import { NumericInput } from "@/components";
import { FACTOR_INPUT_DECIMAL_SCALE } from "@/config/constants";
import { formatter } from "@/utils/formatting";
import type { YearCopyRow } from "../../utils/emissionFactorYearCopy";
import { reasonMessage, VALUE_REASONS } from "./yearCopyReasonMessages";

interface Props {
  row: YearCopyRow;
  onChange: (row: YearCopyRow, value: number | null) => void;
}

const ValueText: FC<{ value: number | null; struck?: boolean }> = ({
  value,
  struck,
}) => (
  <Typography
    variant="body2"
    sx={{
      width: "100%",
      textAlign: "right",
      px: 1,
      textDecoration: struck ? "line-through" : undefined,
      color: struck ? "text.disabled" : undefined,
    }}
  >
    {formatter.exact(value, { ifEmpty: "" })}
  </Typography>
);

interface ValueInputProps {
  initialValue: number | null;
  error?: string;
  edited: boolean;
  onCommit: (value: number | null) => void;
}

/** Remounted when the committed value changes, so it always starts from it. */
const ValueInput: FC<ValueInputProps> = ({
  initialValue,
  error,
  edited,
  onCommit,
}) => {
  // Committed on blur, so the planner runs once per edit, not per keystroke.
  const [localValue, setLocalValue] = useState(initialValue);
  return (
    <Tooltip title={error ?? ""} arrow placement="top">
      {/* Flex, so the inline-flex input sits on no line box and stays centered. */}
      <Box sx={{ width: "100%", display: "flex" }}>
        <NumericInput
          value={localValue}
          onChange={setLocalValue}
          onBlur={() => onCommit(localValue)}
          decimalScale={FACTOR_INPUT_DECIMAL_SCALE}
          placeholder=""
          // Keep the grid's keyboard navigation out of the input.
          onKeyDown={(event) => event.stopPropagation()}
          error={!!error}
          slotProps={{ htmlInput: { "aria-label": "Valor de destino" } }}
          sx={{
            "& .MuiOutlinedInput-root": { backgroundColor: "white" },
            "& input": {
              textAlign: "right",
              fontWeight: edited ? 600 : undefined,
            },
          }}
        />
      </Box>
    </Tooltip>
  );
};

export const YearCopyTargetValueCell: FC<Props> = ({ row, onChange }) => {
  if (row.outcome === YearCopyOutcome.EXISTS_IN_TARGET) {
    // With several target factors none of them is "the" copy.
    const only = row.targetFactors.length === 1 ? row.targetFactors[0] : null;
    return <ValueText value={only?.value ?? null} />;
  }
  if (row.outcome === YearCopyOutcome.EXCLUDED) {
    return <ValueText value={row.targetValue} struck />;
  }
  if (row.gasLocked) {
    return (
      <Tooltip
        title="Este factor tiene desglose GEI: cópialo con su valor y cámbialo en el mantenedor junto con el desglose."
        arrow
        placement="top"
      >
        <Box className="flex w-full items-center justify-end gap-1">
          <LockOutlined fontSize="inherit" color="disabled" />
          <ValueText value={row.targetValue} />
        </Box>
      </Tooltip>
    );
  }

  return (
    <ValueInput
      key={String(row.targetValue)}
      initialValue={row.targetValue}
      error={reasonMessage(row.reasons, (reason) =>
        VALUE_REASONS.includes(reason)
      )}
      edited={row.valueChanged}
      onCommit={(value) => onChange(row, value)}
    />
  );
};

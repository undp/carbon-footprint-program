import { FC } from "react";
import { useWatch, useFormState, useFormContext } from "react-hook-form";
import { Box, Tooltip, Typography } from "@mui/material";
import { WarningAmberRounded } from "@mui/icons-material";
import { SOURCE_OPTIONS } from "../../constants";
import type { EmissionFactorsFormValues } from "../../hooks/useEmissionFactorsForm";
import {
  SOURCE_YEAR_HELPER_TEXT,
  buildSourceYearWarning,
} from "../../utils/emissionFactorSourceGuidance";
import { FreeSoloAutocompleteCell } from "./FreeSoloAutocompleteCell";

const options = SOURCE_OPTIONS.map((o) => o.value);

interface EmissionFactorSourceCellProps {
  rowIndex: number;
  isEditing: boolean;
  onChange: (value: string) => void;
  onClick?: () => void;
}

/**
 * The provider/factor name, with the reporting year kept in its own column.
 *
 * Several providers may publish for the same activity and year, so the name is
 * freely editable per row. It used to be locked to whatever the subcategory's
 * other factors used, which made a second provider impossible to enter.
 */
export const EmissionFactorSourceCell: FC<EmissionFactorSourceCellProps> = ({
  rowIndex,
  isEditing,
  onChange,
  onClick,
}) => {
  const { control } = useFormContext<EmissionFactorsFormValues>();
  const formValue = useWatch<EmissionFactorsFormValues>({
    name: `emissionFactors.${rowIndex}.source`,
  }) as string;
  const { errors } = useFormState({
    control,
    name: `emissionFactors.${rowIndex}.source`,
  });
  const fieldError = errors.emissionFactors?.[rowIndex]?.source;

  const yearWarning = buildSourceYearWarning(formValue ?? "");

  const field = (
    <FreeSoloAutocompleteCell
      value={formValue}
      options={options}
      isEditing={isEditing}
      onChange={onChange}
      onClick={onClick}
      errorMessage={fieldError?.message}
      helperText={
        isEditing && !fieldError ? SOURCE_YEAR_HELPER_TEXT : undefined
      }
    />
  );

  if (!yearWarning) return field;

  // Advisory only: rendered beside the value, never as a validation error, so
  // saving stays available.
  return (
    <Box
      sx={{ display: "flex", alignItems: "center", gap: 0.5, width: "100%" }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>{field}</Box>
      <Tooltip title={yearWarning} arrow placement="top">
        <Typography component="span" sx={{ display: "flex" }}>
          <WarningAmberRounded
            fontSize="small"
            color="warning"
            aria-label={yearWarning}
          />
        </Typography>
      </Tooltip>
    </Box>
  );
};

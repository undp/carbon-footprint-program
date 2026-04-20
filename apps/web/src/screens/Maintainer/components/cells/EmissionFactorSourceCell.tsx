import { FC, useEffect, useRef } from "react";
import { useWatch, useFormState, useFormContext } from "react-hook-form";
import { Tooltip, Typography } from "@mui/material";
import { Lock as LockIcon } from "@mui/icons-material";
import { SOURCE_OPTIONS } from "../../constants";
import type { EmissionFactorsFormValues } from "../../hooks/useEmissionFactorsForm";
import { FreeSoloAutocompleteCell } from "./FreeSoloAutocompleteCell";
import { useOverflowTooltip } from "@/hooks";

const options = SOURCE_OPTIONS.map((o) => o.value);

const normalizeSourceValue = (value?: string | null) =>
  value?.trim().replace(/\s+/g, " ") ?? "";

interface EmissionFactorSourceCellProps {
  rowIndex: number;
  isEditing: boolean;
  onChange: (value: string) => void;
  onClick?: () => void;
  isSourceLocked?: boolean;
  lockedSource?: string;
}

export const EmissionFactorSourceCell: FC<EmissionFactorSourceCellProps> = ({
  rowIndex,
  isEditing,
  onChange,
  onClick,
  isSourceLocked = false,
  lockedSource,
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
  const onChangeRef = useRef(onChange);

  const { isOverflowed, overflowRef } = useOverflowTooltip<HTMLElement>([
    formValue,
    lockedSource,
  ]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!isSourceLocked || !lockedSource) {
      return;
    }

    const normalizedLockedSource = normalizeSourceValue(lockedSource);
    const normalizedFormValue = normalizeSourceValue(formValue);

    if (normalizedFormValue === normalizedLockedSource) {
      return;
    }

    onChangeRef.current(lockedSource);
  }, [isSourceLocked, lockedSource, formValue]);

  if (isSourceLocked && isEditing) {
    const displayValue = lockedSource ?? formValue;
    return (
      <Tooltip
        title="La fuente es compartida por todos los factores de emisión de esta subcategoría y no puede ser modificada individualmente."
        arrow
        placement="top"
      >
        <Typography
          ref={overflowRef}
          sx={{
            px: 1,
            py: 0.5,
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            color: "text.secondary",
            backgroundColor: "grey.100",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            width: "100%",
            cursor: "not-allowed",
          }}
        >
          <LockIcon sx={{ fontSize: 14, color: "text.disabled" }} />
          {displayValue}
        </Typography>
      </Tooltip>
    );
  }

  if (isSourceLocked && !isEditing) {
    const displayValue = lockedSource ?? formValue;
    const tooltipText = isOverflowed
      ? `${displayValue} — La fuente es compartida por todos los factores de esta subcategoría.`
      : "La fuente es compartida por todos los factores de emisión de esta subcategoría.";
    return (
      <Tooltip title={tooltipText} arrow placement="top" enterDelay={500}>
        <Typography
          ref={overflowRef}
          sx={{
            px: 1,
            py: 0.5,
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            cursor: "default",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            width: "100%",
          }}
        >
          <LockIcon sx={{ fontSize: 14, color: "text.disabled" }} />
          {displayValue}
        </Typography>
      </Tooltip>
    );
  }

  return (
    <FreeSoloAutocompleteCell
      value={formValue}
      options={options}
      isEditing={isEditing}
      onChange={onChange}
      onClick={onClick}
      errorMessage={fieldError?.message}
    />
  );
};

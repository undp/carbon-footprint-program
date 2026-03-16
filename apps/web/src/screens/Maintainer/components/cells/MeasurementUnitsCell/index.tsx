import { FC, useEffect, useRef, useMemo } from "react";
import { useWatch, useFormState, useFormContext } from "react-hook-form";
import { getNestedError } from "../cellUtils";
import { ReadMeasurementUnitsCell } from "./ReadMeasurementUnitsCell";
import { EditMeasurementUnitsCell } from "./EditMeasurementUnitsCell";
import type { MeasurementUnit } from "../../../types";

interface MeasurementUnitsCellProps {
  formArrayName: string;
  rowIndex: number;
  isEditing: boolean;
  allUnits: MeasurementUnit[];
  onChange: (unitIds: string[]) => void;
  onClick?: () => void;
}

export const MeasurementUnitsCell: FC<MeasurementUnitsCellProps> = ({
  formArrayName,
  rowIndex,
  isEditing,
  allUnits,
  onChange,
  onClick,
}) => {
  const formPath = `${formArrayName}.${rowIndex}.measurementUnitIds`;
  const { control } = useFormContext();
  const rawUnitIds: unknown = useWatch({ control, name: formPath });
  const unitIds = useMemo(
    () =>
      Array.isArray(rawUnitIds)
        ? rawUnitIds.filter((id): id is string => typeof id === "string")
        : [],
    [rawUnitIds]
  );
  const { errors } = useFormState({ control, name: formPath });
  const fieldError = getNestedError(
    errors,
    formArrayName,
    rowIndex,
    "measurementUnitIds"
  );

  const selectedUnits = useMemo(
    () => allUnits.filter((u) => unitIds.includes(u.id)),
    [allUnits, unitIds]
  );

  const hasError = isEditing && !!fieldError;

  const autoOpenRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && autoOpenRef.current) {
      autoOpenRef.current = false;
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleOpenAndEdit = () => {
    autoOpenRef.current = true;
    onClick?.();
  };

  if (!isEditing) {
    return (
      <ReadMeasurementUnitsCell
        selectedUnits={selectedUnits}
        unitIds={unitIds}
        onChange={onChange}
        onClick={onClick}
        onOpenAndEdit={handleOpenAndEdit}
      />
    );
  }

  return (
    <EditMeasurementUnitsCell
      allUnits={allUnits}
      selectedUnits={selectedUnits}
      hasError={hasError}
      inputRef={inputRef}
      onChange={onChange}
    />
  );
};

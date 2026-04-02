import { FC } from "react";
import { useWatch, useFormState, useFormContext } from "react-hook-form";
import { NORMATIVA_OPTIONS } from "../../constants";
import type { MethodologiesFormValues } from "../../hooks/useMethodologiesForm";
import { FreeSoloAutocompleteCell } from "./FreeSoloAutocompleteCell";

const options = NORMATIVA_OPTIONS.map((o) => o.value);

interface MethodologyRegulationCellProps {
  rowIndex: number;
  isEditing: boolean;
  onChange: (value: string) => void;
  onClick?: () => void;
}

export const MethodologyRegulationCell: FC<MethodologyRegulationCellProps> = ({
  rowIndex,
  isEditing,
  onChange,
  onClick,
}) => {
  const { control } = useFormContext<MethodologiesFormValues>();
  const formValue = useWatch<MethodologiesFormValues>({
    name: `methodologies.${rowIndex}.regulation`,
  }) as string;
  const { errors } = useFormState({
    control,
    name: `methodologies.${rowIndex}.regulation`,
  });
  const fieldError = errors.methodologies?.[rowIndex]?.regulation;

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

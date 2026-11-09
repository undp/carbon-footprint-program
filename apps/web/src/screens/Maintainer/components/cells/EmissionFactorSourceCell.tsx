import { FC } from "react";
import { useWatch, useFormState, useFormContext } from "react-hook-form";
import { SOURCE_OPTIONS } from "../../constants";
import type { EmissionFactorsFormValues } from "../../hooks/useEmissionFactorsForm";
import { FreeSoloAutocompleteCell } from "./FreeSoloAutocompleteCell";

const options = SOURCE_OPTIONS.map((o) => o.value);

interface EmissionFactorSourceCellProps {
  rowIndex: number;
  isEditing: boolean;
  onChange: (value: string) => void;
  onClick?: () => void;
}

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

import { FC } from "react";
import { useWatch } from "react-hook-form";
import { NumericInput } from "@/components";

interface EmissionEditorQuantityCellProps {
  subcategoryId: string;
  lineId: string;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}

export const EmissionEditorQuantityCell: FC<
  EmissionEditorQuantityCellProps
> = ({ subcategoryId, lineId, onChange, disabled = false }) => {
  const value = useWatch({
    name: `subcategories.${subcategoryId}.lines.${lineId}.quantity`,
  }) as number | null | undefined;

  return (
    <NumericInput
      value={value ?? null}
      onChange={onChange}
      disabled={disabled}
      min={0}
      placeholder=""
      sx={{ minHeight: "unset" }}
    />
  );
};

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
  }) as number | null;

  return (
    <NumericInput
      value={value}
      onChange={onChange}
      disabled={disabled}
      min={0}
      sx={{ minHeight: "unset" }}
    />
  );
};

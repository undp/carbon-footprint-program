import { FC } from "react";
import { NumericInput } from "@/components";

interface EmissionEditorQuantityCellProps {
  value: number | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export const EmissionEditorQuantityCell: FC<
  EmissionEditorQuantityCellProps
> = ({ value, onChange, disabled = false }) => {
  return <NumericInput value={value} onChange={onChange} disabled={disabled} />;
};

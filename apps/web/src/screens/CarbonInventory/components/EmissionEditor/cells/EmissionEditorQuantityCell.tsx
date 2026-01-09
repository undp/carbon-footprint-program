import { FC } from "react";
import { NumericInput } from "@/components";

interface EmissionEditorQuantityCellProps {
  value: number | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const EmissionEditorQuantityCell: FC<
  EmissionEditorQuantityCellProps
> = ({ value, onChange }) => {
  return <NumericInput value={value} onChange={onChange} />;
};

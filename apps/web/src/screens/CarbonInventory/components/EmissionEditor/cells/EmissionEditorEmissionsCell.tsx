import { FC } from "react";
import { useWatch } from "react-hook-form";
import { Typography } from "@mui/material";
import { kgToTon } from "@/utils/number";
import { formatEmissions } from "@/utils/formatting";

interface EmissionEditorEmissionsCellProps {
  subcategoryId: string;
  lineId: string;
}

export const EmissionEditorEmissionsCell: FC<
  EmissionEditorEmissionsCellProps
> = ({ subcategoryId, lineId }) => {
  const quantity = useWatch({
    name: `subcategories.${subcategoryId}.lines.${lineId}.quantity`,
  }) as number | null | undefined;

  const factorValue = useWatch({
    name: `subcategories.${subcategoryId}.lines.${lineId}.factorValue`,
  }) as number | null | undefined;

  const totalEmissions = kgToTon((quantity || 0) * (factorValue || 0));

  return <Typography>{formatEmissions(totalEmissions)}</Typography>;
};

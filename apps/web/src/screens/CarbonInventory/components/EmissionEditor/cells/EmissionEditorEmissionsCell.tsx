import { FC } from "react";
import { useWatch } from "react-hook-form";
import { Typography } from "@mui/material";
import { round } from "lodash-es";

interface EmissionEditorEmissionsCellProps {
  subcategoryId: string;
  lineId: string;
}

export const EmissionEditorEmissionsCell: FC<
  EmissionEditorEmissionsCellProps
> = ({ subcategoryId, lineId }) => {
  const quantity = useWatch({
    name: `subcategories.${subcategoryId}.lines.${lineId}.quantity`,
  }) as number | null;

  const factorValue = useWatch({
    name: `subcategories.${subcategoryId}.lines.${lineId}.factorValue`,
  }) as number | null;

  const totalEmissions = round((quantity || 0) * (factorValue || 0), 2);

  return <Typography>{totalEmissions}</Typography>;
};

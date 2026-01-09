import { FC } from "react";
import { Typography } from "@mui/material";
import { round } from "lodash-es";

interface EmissionEditorEmissionsCellProps {
  quantity: number | null;
  factorValue: number | null;
}

export const EmissionEditorEmissionsCell: FC<
  EmissionEditorEmissionsCellProps
> = ({ quantity, factorValue }) => {
  const totalEmissions = round((quantity || 0) * (factorValue || 0), 2);

  return <Typography>{totalEmissions}</Typography>;
};

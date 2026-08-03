import { FC } from "react";
import { useWatch } from "react-hook-form";
import { DetailTooltipText } from "@/components";
import { kgToTon } from "@/utils/number";
import { formatter } from "@/utils/formatting";
import { RateMeasurementUnit } from "../../../types";

interface EmissionEditorEmissionsCellProps {
  subcategoryId: string;
  lineId: string;
  rateMeasurementUnits: RateMeasurementUnit[] | undefined;
}

export const EmissionEditorEmissionsCell: FC<
  EmissionEditorEmissionsCellProps
> = ({ subcategoryId, lineId, rateMeasurementUnits }) => {
  const quantity = useWatch({
    name: `subcategories.${subcategoryId}.lines.${lineId}.quantity`,
  }) as number | null | undefined;

  const factorValue = useWatch({
    name: `subcategories.${subcategoryId}.lines.${lineId}.factorValue`,
  }) as number | null | undefined;

  const measurementUnitId = useWatch({
    name: `subcategories.${subcategoryId}.lines.${lineId}.measurementUnitId`,
  }) as string | null | undefined;

  const totalEmissionsKg = (quantity || 0) * (factorValue || 0);
  const totalEmissions = kgToTon(totalEmissionsKg);

  const unit = rateMeasurementUnits?.find(
    (rmu) => rmu.denominatorUnit.id === measurementUnitId
  );

  const isComputable = quantity != null && factorValue != null;

  // Audit trail for the user who redoes the multiplication by hand: the chain
  // uses the unrounded factor, which is the number the total actually comes
  // from. A line without quantity or without factor has no chain to show.
  const calculationDetail = isComputable
    ? `${formatter.quantity(quantity)} ${unit?.denominatorUnit.abbreviation ?? ""} × ${formatter.emissionFactorExact(factorValue)} ${unit?.abbreviation ?? ""} = ${formatter.quantity(totalEmissionsKg)} kg = ${formatter.emissions(totalEmissions, { withSuffix: false })} t`.replace(
        /\s+/g,
        " "
      )
    : "";

  return (
    <DetailTooltipText detail={calculationDetail}>
      {formatter.emissions(totalEmissions)}
    </DetailTooltipText>
  );
};

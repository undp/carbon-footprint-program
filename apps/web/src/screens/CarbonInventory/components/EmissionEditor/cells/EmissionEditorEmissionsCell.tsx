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
  /** Roving tabindex from the grid cell, so the tooltip trigger is not a
   * fixed tab stop per row. */
  tabIndex?: number;
}

export const EmissionEditorEmissionsCell: FC<
  EmissionEditorEmissionsCellProps
> = ({ subcategoryId, lineId, rateMeasurementUnits, tabIndex }) => {
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

  // Audit trail for the user who redoes the multiplication by hand, so every
  // number of the chain goes unrounded: with the display formatters a quantity
  // of 0,12345 would read "0,12 × 0,056944 = 0,00703", a line that does not
  // multiply out and defeats the whole point of showing it. A line without
  // quantity or without factor has no chain to show.
  const calculationDetail = isComputable
    ? [
        formatter.exact(quantity),
        unit?.denominatorUnit.abbreviation,
        "×",
        formatter.exact(factorValue),
        unit?.abbreviation,
        "=",
        formatter.exact(totalEmissionsKg),
        "kg =",
        formatter.exact(totalEmissions),
        "t",
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <DetailTooltipText detail={calculationDetail} tabIndex={tabIndex}>
      {formatter.emissions(totalEmissions)}
    </DetailTooltipText>
  );
};

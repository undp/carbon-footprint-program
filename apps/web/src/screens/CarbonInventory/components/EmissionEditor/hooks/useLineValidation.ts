import { useWatch } from "react-hook-form";
import { GetCarbonInventoryMethodologyResponse } from "@repo/types";
import {
  LineValidationState,
  EmissionCaptureFormLine,
} from "../../../types/EmissionCaptureTypes";
import {
  canSelectFactorSource,
  canEditFactorValue,
  getDisabledReasonMessage,
} from "../services/fieldValidationService";

type EmissionFactorDimensions =
  GetCarbonInventoryMethodologyResponse["categories"][number]["subcategories"][number]["dimensions"];

export const useLineValidation = (
  subcategoryId: string,
  lineId: string,
  dimensions: EmissionFactorDimensions
): LineValidationState => {
  const line = useWatch({
    name: `subcategories.${subcategoryId}.lines.${lineId}`,
  }) as EmissionCaptureFormLine | undefined;

  if (!line) {
    return {
      canSelectFactorSource: false,
      canEditFactorValue: false,
      factorSourceDisabledReason: null,
      factorValueDisabledReason: null,
    };
  }

  return {
    canSelectFactorSource: canSelectFactorSource(line, dimensions),
    canEditFactorValue: canEditFactorValue(line),
    factorSourceDisabledReason: getDisabledReasonMessage(
      "factorSource",
      line,
      dimensions
    ),
    factorValueDisabledReason: getDisabledReasonMessage(
      "factorValue",
      line,
      dimensions
    ),
  };
};

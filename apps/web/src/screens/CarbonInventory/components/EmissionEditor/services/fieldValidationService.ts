import { EmissionCaptureFormLine } from "../../../types/EmissionCaptureTypes";
import { CUSTOM_FACTOR_SOURCES } from "@/config/constants";
import { MethodologyEmissionFactorDimension } from "../../../types";

const areRequiredDimensionsFilled = (
  line: EmissionCaptureFormLine,
  dimensions: MethodologyEmissionFactorDimension[]
): boolean => {
  // Check first dimension if it exists and is required
  const firstDimension = dimensions.find((d) => d.position === 1);
  if (firstDimension?.isRequired && !line.dimensionValue1Id) {
    return false;
  }

  // Check second dimension if it exists and is required
  const secondDimension = dimensions.find((d) => d.position === 2);
  if (secondDimension?.isRequired && !line.dimensionValue2Id) {
    return false;
  }

  return true;
};

const isMeasurementUnitSelected = (line: EmissionCaptureFormLine): boolean => {
  return !!line.measurementUnitId;
};

export const canSelectFactorSource = (
  line: EmissionCaptureFormLine,
  dimensions: MethodologyEmissionFactorDimension[]
): boolean => {
  return (
    (!!line.factorSource &&
      CUSTOM_FACTOR_SOURCES.includes(line.factorSource)) ||
    (areRequiredDimensionsFilled(line, dimensions) &&
      isMeasurementUnitSelected(line))
  );
};

export const canEditFactorValue = (line: EmissionCaptureFormLine): boolean => {
  // Rule: Factor source must be selected to edit factor value (if it's a custom source)
  return !!line.factorSource;
};

export const getDisabledReasonMessage = (
  fieldName: "factorSource" | "factorValue",
  line: EmissionCaptureFormLine,
  dimensions: MethodologyEmissionFactorDimension[]
): string | null => {
  if (fieldName === "factorSource") {
    if (
      line.factorSource &&
      CUSTOM_FACTOR_SOURCES.includes(line.factorSource)
    ) {
      return null;
    }

    if (!areRequiredDimensionsFilled(line, dimensions)) {
      const missingDimensions = dimensions
        .filter((d) => {
          if (d.position === 1 && d.isRequired && !line.dimensionValue1Id)
            return true;
          if (d.position === 2 && d.isRequired && !line.dimensionValue2Id)
            return true;
          return false;
        })
        .map((d) => d.name);
      return `Completa las dimensiones requeridas: ${missingDimensions.join(", ")}`;
    }
    if (!isMeasurementUnitSelected(line)) {
      return "Selecciona una unidad de medida primero";
    }
  }

  if (fieldName === "factorValue") {
    if (!line.factorSource) {
      return "Selecciona una fuente de factor primero";
    }
  }

  return null;
};

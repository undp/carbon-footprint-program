export const formatEmissions = (value: number, withSuffix = true): string =>
  `${value.toLocaleString("es", { minimumFractionDigits: 0, maximumFractionDigits: 2, useGrouping: true })}${withSuffix ? " tCO₂e" : ""}`;

export const formatQuantity = (value: number): string =>
  value.toLocaleString("es", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: true,
  });

export const formatPercentage = (value: number): string =>
  `${(value * 100).toLocaleString("es", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`;

export const formatEmissionFactor = (value: number): string =>
  value.toLocaleString("es", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: true,
  });

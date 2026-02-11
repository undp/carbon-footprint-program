export const formatEmissions = (value: number): string =>
  `${value.toLocaleString("es", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} tCO₂e`;

export const formatQuantity = (value: number): string =>
  value.toLocaleString("es", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export const formatPercentage = (value: number): string =>
  `${(value * 100).toLocaleString("es", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`;

export const formatEmissionFactor = (value: number): string =>
  value.toLocaleString("es", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const formatEmissions = (value: number): string =>
  `${value.toLocaleString("es", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} tCO₂e`;

export const formatPercentage = (value: number): string =>
  `${(value * 100).toLocaleString("es", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

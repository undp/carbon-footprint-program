export const formatEmissionFactor = (value: number): string =>
  value.toLocaleString("es", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: true,
  });

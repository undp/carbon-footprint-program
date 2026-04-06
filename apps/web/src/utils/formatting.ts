export const formatDate = (dateStr: string): string =>
  new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));

export const formatDateTime = (dateStr: string): string =>
  new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateStr));

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

export { formatEmissionFactor } from "@repo/utils";

export const formatRate = (value: number): string =>
  value.toLocaleString("es", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: true,
  });

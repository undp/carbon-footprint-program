export const transparencyKeys = {
  all: ["transparency"] as const,
  byYear: (year?: number) => ["transparency", { year }] as const,
};

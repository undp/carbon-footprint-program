export const systemParameterKeys = {
  all: ["systemParameters"] as const,
  byKeys: (keys?: string) => ["systemParameters", keys] as const,
};

export const attachDetails = <T extends Error>(
  error: T,
  details: Record<string, unknown>
): T => {
  (error as T & { details?: Record<string, unknown> }).details = details;
  return error;
};

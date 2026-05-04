import createError from "@fastify/error";

export const RequestTooLargeError = createError("REQUEST_TOO_LARGE", "%s", 413);

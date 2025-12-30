export type AppError =
  | { kind: "auth"; message: string; status: number }
  | { kind: "validation"; message: string; details?: unknown; status: number }
  | { kind: "unknown"; message: string; status?: number };

export type NormalizedError = AppError & {
  request: { url: string; method: string };
  body?: unknown;
};

export class AppHttpError extends Error {
  constructor(public readonly detail: NormalizedError) {
    super(detail.message);
    this.name = "AppHttpError";
  }
}

type ErrorBody = {
  message?: unknown;
  errors?: unknown;
};

const isErrorBody = (value: unknown): value is ErrorBody => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const normalizeError = async (
  request: Request,
  res: Response
): Promise<NormalizedError> => {
  const status = res.status;
  let body: unknown;
  let bodyMessage: string | undefined;
  let bodyErrors: unknown;

  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (isErrorBody(body)) {
    if (typeof body.message === "string") {
      bodyMessage = body.message;
    }
    bodyErrors = body.errors;
  }

  if (status === 401 || status === 403) {
    return {
      kind: "auth",
      message: status === 401 ? "Sesión expirada" : "Acceso denegado",
      status,
      request: { url: request.url, method: request.method },
      body,
    };
  }

  if (status === 400 && bodyErrors !== undefined) {
    return {
      kind: "validation",
      message: "Datos inválidos",
      details: bodyErrors,
      status,
      request: { url: request.url, method: request.method },
      body,
    };
  }

  if (status >= 500) {
    return {
      kind: "unknown",
      message: "Error del servidor",
      status,
      request: { url: request.url, method: request.method },
      body,
    };
  }

  return {
    kind: "unknown",
    message: bodyMessage ?? "Error desconocido",
    status,
    request: { url: request.url, method: request.method },
    body,
  };
};

export type AppError =
  | { kind: "auth"; message: string; status: number }
  | { kind: "validation"; message: string; details?: unknown; status: number }
  | { kind: "unknown"; message: string; status?: number };

/**
 * Mirrors the API's `ApiErrorResponse` shape returned by the error handler.
 * Every API error response contains `{ code, message }` and may include a `details`
 * record with structured context. The API's `message` is a developer-facing
 * sentence; user-facing copy is composed on the frontend by `getApiErrorMessage`
 * using `code + details`.
 */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export const isApiErrorBody = (value: unknown): value is ApiErrorBody => {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.code !== "string" || typeof v.message !== "string") return false;
  if (
    v.details !== undefined &&
    (typeof v.details !== "object" || v.details === null)
  )
    return false;
  return true;
};

export type NormalizedError = AppError & {
  request: { url: string; method: string };
  body?: unknown;
};

export class AppHttpError extends Error {
  constructor(public readonly detail: NormalizedError) {
    super(detail.message);
    this.name = "AppHttpError";
  }

  /** Returns the machine-readable error code from the API response, if present. */
  get errorCode(): string | undefined {
    return isApiErrorBody(this.detail.body) ? this.detail.body.code : undefined;
  }

  /** Returns the developer-facing message from the API response, if present. */
  get apiMessage(): string | undefined {
    return isApiErrorBody(this.detail.body)
      ? this.detail.body.message
      : undefined;
  }

  /** Returns the structured `details` payload from the API response, if present. */
  get apiDetails(): Record<string, unknown> | undefined {
    return isApiErrorBody(this.detail.body)
      ? this.detail.body.details
      : undefined;
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

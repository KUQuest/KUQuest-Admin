export type ApiSuccess<T = undefined> = T extends undefined
  ? { success: true }
  : { success: true; data: T };

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export function getApiUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  return apiUrl;
}

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

function requestUrl(path: string): string {
  const baseUrl = getApiUrl().replace(/\/$/, "");
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function isBodyInit(value: unknown): value is BodyInit {
  return typeof value === "string"
    || (typeof Blob !== "undefined" && value instanceof Blob)
    || (typeof FormData !== "undefined" && value instanceof FormData)
    || (typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams)
    || (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer);
}

function requestBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (isBodyInit(body)) return body;
  return JSON.stringify(body);
}

async function responseData(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function failureFrom(data: unknown): ApiFailure | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;

  const candidate = data as Record<string, unknown>;
  const error = candidate.error;
  if (candidate.success !== false || !error || typeof error !== "object" || Array.isArray(error)) return null;

  const details = error as Record<string, unknown>;
  if (typeof details.code !== "string" || typeof details.message !== "string") return null;

  return {
    success: false,
    error: {
      code: details.code,
      message: details.message,
    },
  };
}

export class ApiError extends Error {
  public readonly code: string | undefined;

  constructor(
    public readonly status: number,
    public readonly data: unknown,
  ) {
    const failure = failureFrom(data);
    super(failure?.error.message || `API request failed with status ${status}`);
    this.name = "ApiError";
    this.code = failure?.error.code;
  }
}

export async function apiClient<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const { body, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);

  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (body !== undefined && !isBodyInit(body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(requestUrl(path), {
    ...requestOptions,
    credentials: requestOptions.credentials ?? "include",
    headers,
    body: requestBody(body),
  });
  const data = await responseData(response);

  if (!response.ok) {
    throw new ApiError(response.status, data);
  }

  return data as TResponse;
}

function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const candidate = value as Record<string, unknown>;
  return candidate.success === true || failureFrom(value) !== null;
}

export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const envelope = await apiClient<unknown>(path, options);

  if (!isApiEnvelope<TResponse>(envelope)) {
    throw new ApiError(200, envelope);
  }
  if (!envelope.success) {
    throw new ApiError(200, envelope);
  }

  return "data" in envelope ? envelope.data as TResponse : undefined as TResponse;
}

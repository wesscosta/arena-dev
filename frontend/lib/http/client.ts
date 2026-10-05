import { apiFetch } from "../auth-api";
import { HttpApiError, type ApiErrorBody } from "./errors";

export type ApiErrorFactory = (
  message: string,
  status: number,
  fields?: Record<string, string>,
) => Error;

export type ApiRequestOptions = {
  credentials?: RequestCredentials;
  errorMessage?: string | ((status: number) => string);
  errorFactory?: ApiErrorFactory;
};

function fallbackMessage(value: ApiRequestOptions["errorMessage"], status: number) {
  if (typeof value === "function") return value(status);
  return value ?? `Falha na API (${status}).`;
}

async function readErrorBody(response: Response): Promise<ApiErrorBody | undefined> {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return undefined;
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  options: ApiRequestOptions = {},
): Promise<T> {
  const response = await apiFetch(path, init, options.credentials ?? "include");

  if (!response.ok) {
    const body = await readErrorBody(response);
    const message =
      body?.message ?? body?.detail ?? fallbackMessage(options.errorMessage, response.status);
    if (options.errorFactory) {
      throw options.errorFactory(message, response.status, body?.fields);
    }
    throw new HttpApiError(message, response.status, body?.fields);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

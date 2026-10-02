export type ApiErrorBody = {
  message?: string;
  detail?: string;
  fields?: Record<string, string>;
};

export class HttpApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "HttpApiError";
  }
}

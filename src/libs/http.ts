import { describeError } from '@/libs/text';

export class HttpError extends Error {
  readonly status: number;
  readonly url: string;
  // A 429, or a 403 with an exhausted quota header.
  readonly rateLimited: boolean;

  constructor(status: number, url: string, rateLimited = status === 429) {
    super(`HTTP ${status} for ${new URL(url).host}`);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
    this.rateLimited = rateLimited;
  }
}

const DEFAULT_TIMEOUT = 15_000;

export interface RequestOptions extends RequestInit {
  timeout?: number;
}

export const INSECURE = 'Only secure (https://) addresses are supported';

// HTTPS only, even for addresses from an imported backup; redirects are followed, but a response
// that ends on plain HTTP is never read.
export const request = async (url: string, { timeout = DEFAULT_TIMEOUT, ...init }: RequestOptions = {}): Promise<Response> => {
  if (!url.startsWith('https://')) throw new Error(INSECURE);
  const signal = init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout);
  const response = await fetch(url, { ...init, signal });
  if (response.url && !response.url.startsWith('https://')) throw new Error(INSECURE);
  if (!response.ok) throw new HttpError(response.status, url, response.status === 429 || response.headers.get('x-ratelimit-remaining') === '0');
  return response;
};

export const fetchJson = async <T>(url: string, options?: RequestOptions): Promise<T> => (await request(url, options)).json() as Promise<T>;

export const fetchText = async (url: string, options?: RequestOptions): Promise<string> => (await request(url, options)).text();

export const fetchBlob = async (url: string, options?: RequestOptions): Promise<Blob> => (await request(url, options)).blob();

// Fails outright when every request failed (offline, rate limited), so the caller retries soon.
export const settleAll = async <T>(requests: Promise<T>[]): Promise<PromiseSettledResult<T>[]> => {
  const results = await Promise.allSettled(requests);
  const failure = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failure && results.every((r) => r.status === 'rejected')) throw failure.reason;
  return results;
};

export const errorMessage = (error: unknown): string => {
  if (error instanceof HttpError) {
    if (error.rateLimited) return 'Rate limited, will retry later';
    if (error.status === 401 || error.status === 403) return `Access denied by ${new URL(error.url).host}`;
    if (error.status === 404) return 'Not found';
    return error.message;
  }
  if (error instanceof DOMException && error.name === 'TimeoutError') return 'Request timed out';
  if (error instanceof TypeError) return 'Network error';
  return describeError(error);
};

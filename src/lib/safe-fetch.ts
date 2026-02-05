/**
 * Fetch that retries on network errors (e.g. "other side closed", ECONNRESET).
 * Useful in dev/WSL2 where connections can drop during hot reload or compile.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: { retries?: number; delayMs?: number },
): Promise<Response> {
  const { retries = 2, delayMs = 600 } = options ?? {};
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(input, init);
      return res;
    } catch (err) {
      lastError = err;
      const isNetworkError =
        err instanceof TypeError ||
        (err instanceof Error &&
          (err.message.includes("fetch failed") ||
            err.message.includes("ECONNRESET") ||
            (err as Error & { code?: string }).code === "UND_ERR_SOCKET"));
      if (attempt < retries && isNetworkError) {
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

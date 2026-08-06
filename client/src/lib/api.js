const API_BASE = '/api';

/**
 * The access token is deliberately kept in memory only. The refresh token
 * lives in an httpOnly cookie the browser sends automatically, so a stolen
 * XSS payload cannot read either one out of localStorage.
 */
let accessToken = null;
let refreshPromise = null;
const listeners = new Set();

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

/** Called when the session is definitively over, so the app can redirect. */
export function onSessionExpired(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifySessionExpired() {
  accessToken = null;
  listeners.forEach((listener) => listener());
}

export class ApiError extends Error {
  constructor(message, { status, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  /** Maps server field errors to a { fieldName: message } object for forms. */
  get fieldErrors() {
    const fields = this.details?.fields;
    if (!Array.isArray(fields)) return {};
    return Object.fromEntries(fields.map((f) => [f.path, f.message]));
  }
}

async function parse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

/**
 * Refreshes the access token. Concurrent 401s share a single in-flight
 * request so one expiry does not trigger a stampede of refreshes.
 */
function refreshAccessToken() {
  refreshPromise ??= fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then(async (response) => {
      if (!response.ok) throw new ApiError('Session expired', { status: 401 });
      const body = await parse(response);
      accessToken = body?.data?.accessToken ?? null;
      return body?.data ?? null;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

async function send(path, { method = 'GET', body, headers = {}, signal, raw = false } = {}) {
  const isFormData = body instanceof FormData;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    signal,
    headers: {
      ...(isFormData || body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: isFormData ? body : body === undefined ? undefined : JSON.stringify(body),
  });

  if (raw) return response;

  const payload = await parse(response);

  if (!response.ok) {
    throw new ApiError(payload?.message || `Request failed (${response.status})`, {
      status: response.status,
      details: payload?.details,
    });
  }

  return payload?.data ?? payload;
}

/**
 * Performs a request, transparently refreshing the access token once if the
 * server reports it has expired.
 */
async function request(path, options = {}) {
  try {
    return await send(path, options);
  } catch (error) {
    const isAuthFailure = error instanceof ApiError && error.status === 401;
    const isAuthRoute = path.startsWith('/auth/');

    if (!isAuthFailure || isAuthRoute || options._retried) {
      if (isAuthFailure && !isAuthRoute) notifySessionExpired();
      throw error;
    }

    try {
      await refreshAccessToken();
    } catch {
      notifySessionExpired();
      throw error;
    }

    return send(path, { ...options, _retried: true });
  }
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
  raw: (path, options) => request(path, { ...options, raw: true }),
  refresh: refreshAccessToken,
};

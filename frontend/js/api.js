/* api.js — multipart upload to API Gateway, with timeout, one retry, and typed errors. */

export const API_BASE =
  location.hostname === 'localhost' ? 'http://localhost:8000' : window.__NUTRIVISION_API__ || '';

const TIMEOUT_MS = 20000;

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function post(path, formData, attempt = 0) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      body: formData,          // never set Content-Type: the browser writes the multipart boundary
      signal: ctl.signal,
      mode: 'cors',
      cache: 'no-store',
    });
    if (res.status === 413) throw new ApiError('That image is too large. Move back and scan again.', 413);
    if (res.status === 429) throw new ApiError('Too many scans. Wait a few seconds.', 429);
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new ApiError(detail.detail || `Server returned ${res.status}.`, res.status);
    }
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new ApiError('The scan timed out. Check your connection.', 408);
    if (err instanceof ApiError) throw err;
    if (attempt === 0) return post(path, formData, 1);      // one retry for transient network faults
    throw new ApiError('Cannot reach the server. The app works offline for capture only.', 0);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {Blob} blob      JPEG frame
 * @param {object} meta    { referenceWidthMm } optional fiducial scale for mass estimation
 */
export function analyzePlate(blob, meta = {}) {
  const fd = new FormData();
  fd.append('file', blob, 'plate.jpg');
  if (meta.referenceWidthMm) fd.append('reference_width_mm', String(meta.referenceWidthMm));
  return post('/api/v1/analyze', fd);
}

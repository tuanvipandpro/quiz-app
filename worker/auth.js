import { decodeProtectedHeader, importX509, jwtVerify } from 'jose';
import { ApiError } from './config.js';

const CERTS =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
export function createCertificateResolver(fetchImpl = fetch, now = Date.now, parse = importX509) {
  const imported = new Map();
  let cached = null,
    expires = 0,
    loading = null;
  return async (kid) => {
    if (!cached || now() >= expires) {
      loading ||= (async () => {
        let response;
        try {
          response = await fetchImpl(CERTS);
        } catch {
          throw new ApiError('AUTH_UNAVAILABLE', 503);
        }
        if (!response.ok) throw new ApiError('AUTH_UNAVAILABLE', 503);
        const certs = await response.json();
        const ttl = Number(
          response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] || 300
        );
        cached = certs;
        imported.clear();
        expires = now() + Math.min(ttl, 3600) * 1000;
      })().finally(() => {
        loading = null;
      });
      await loading;
    }
    if (!Object.hasOwn(cached, kid)) throw new ApiError('AUTH', 401);
    if (!imported.has(kid)) imported.set(kid, parse(cached[kid], 'RS256'));
    return imported.get(kid);
  };
}

export function createFirebaseVerifier(resolveKey = createCertificateResolver()) {
  return async (request, projectId, now = Date.now()) => {
    const token = request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];
    if (!token || token.length > 8192 || !projectId) throw new ApiError('AUTH', 401);
    try {
      const header = decodeProtectedHeader(token);
      if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error();
      const { payload } = await jwtVerify(token, await resolveKey(header.kid), {
        algorithms: ['RS256'],
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
        currentDate: new Date(now),
        requiredClaims: ['exp', 'iat', 'sub', 'auth_time'],
      });
      if (
        typeof payload.sub !== 'string' ||
        !payload.sub ||
        payload.sub.length > 128 ||
        !Number.isFinite(payload.iat) ||
        payload.iat > now / 1000 ||
        !Number.isFinite(payload.auth_time) ||
        payload.auth_time > now / 1000 ||
        typeof payload.firebase?.sign_in_provider !== 'string' ||
        payload.firebase.sign_in_provider === 'anonymous'
      )
        throw new Error();
      return payload.sub;
    } catch (error) {
      if (error.code === 'AUTH_UNAVAILABLE') throw error;
      throw new ApiError('AUTH', 401);
    }
  };
}

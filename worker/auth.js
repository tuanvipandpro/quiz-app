import { decodeProtectedHeader, importJWK, jwtVerify } from 'jose';
import { ApiError } from './config.js';

// Published by Firebase's OIDC discovery document; avoids PEM/ASN.1 parsing on cold requests.
const JWKS =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
export function createSigningKeyResolver(fetchImpl = fetch, now = Date.now, parse = importJWK) {
  const imported = new Map();
  let cached = null,
    expires = 0,
    loading = null;
  return async (kid) => {
    if (!cached || now() >= expires) {
      loading ||= (async () => {
        let response;
        try {
          response = await fetchImpl(JWKS);
        } catch {
          throw new ApiError('AUTH_UNAVAILABLE', 503);
        }
        if (!response.ok) throw new ApiError('AUTH_UNAVAILABLE', 503);
        const document = await response.json();
        if (!Array.isArray(document.keys) || !document.keys.length)
          throw new ApiError('AUTH_UNAVAILABLE', 503);
        const keys = new Map(
          document.keys
            .filter(
              (key) =>
                typeof key.kid === 'string' &&
                key.kty === 'RSA' &&
                (!key.alg || key.alg === 'RS256') &&
                (!key.use || key.use === 'sig')
            )
            .map((key) => [key.kid, key])
        );
        const ttl = Number(
          response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] || 300
        );
        cached = keys;
        imported.clear();
        expires = now() + Math.min(ttl, 3600) * 1000;
      })().finally(() => {
        loading = null;
      });
      await loading;
    }
    if (!cached.has(kid)) throw new ApiError('AUTH', 401);
    if (!imported.has(kid)) imported.set(kid, parse(cached.get(kid), 'RS256'));
    return imported.get(kid);
  };
}

export function createFirebaseVerifier(resolveKey = createSigningKeyResolver()) {
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

import { createRemoteJWKSet, jwtVerify } from 'jose';

export type AccessConfig = {
  CLASTERIA_ACCESS_ISSUER?: string;
  CLASTERIA_ACCESS_AUD?: string;
  CLASTERIA_EDITOR_ALLOWED_EMAILS?: string;
};

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export function accessConfiguration(env: AccessConfig) {
  const issuer = env.CLASTERIA_ACCESS_ISSUER ?? '';
  const audience = env.CLASTERIA_ACCESS_AUD ?? '';
  const emails = (env.CLASTERIA_EDITOR_ALLOWED_EMAILS ?? '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
  // The certs URL is operator-controlled, never derived from an unverified token.
  if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer) || !audience || !emails.length) return null;
  if (emails.some(email => !/^[^\s@,]+@[^\s@,]+$/.test(email))) return null;
  return { issuer, audience, emails };
}

export async function verifyEditorIdentity(
  request: Request, config: NonNullable<ReturnType<typeof accessConfiguration>>,
) {
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token || token.length > 16_384) return null;
  let keys = keySets.get(config.issuer);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(`${config.issuer}/cdn-cgi/access/certs`), { timeoutDuration: 5000 });
    keySets.set(config.issuer, keys);
  }
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer: config.issuer, audience: config.audience, algorithms: ['RS256'],
      requiredClaims: ['sub', 'email', 'exp', 'iat'],
    });
    if (payload.type !== 'app' || typeof payload.sub !== 'string' || !payload.sub
      || typeof payload.email !== 'string' || !config.emails.includes(payload.email.toLowerCase())) return null;
    // Store a stable opaque identity, not an email or a session token.
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${config.issuer}\n${payload.sub}`));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }
  catch { return null; }
}

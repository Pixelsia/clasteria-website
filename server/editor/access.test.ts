import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { accessConfiguration, verifyEditorIdentity } from './access';

const issuer = 'https://clasteria-test.cloudflareaccess.com';
const config = { issuer, audience: 'test-app', emails: ['editor@pixelsia.net'] };
let privateKey: CryptoKey;
let otherKey: CryptoKey;
let publicJwk: object;

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  otherKey = (await generateKeyPair('RS256')).privateKey;
  publicJwk = { ...await exportJWK(pair.publicKey), kid: 'test-key', alg: 'RS256', use: 'sig' };
});
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ keys: [publicJwk] })));
});
afterEach(() => vi.unstubAllGlobals());

async function token(overrides: Record<string, unknown> = {}, key = privateKey) {
  return new SignJWT({ type: 'app', email: 'editor@pixelsia.net', ...overrides })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setSubject('user-1')
    .setIssuer(issuer).setAudience('test-app').setIssuedAt().setExpirationTime('10m').sign(key);
}
function request(jwt?: string) {
  return new Request('https://preview.pages.dev/api/editor/home', { headers: jwt ? { 'Cf-Access-Jwt-Assertion': jwt } : {} });
}

describe('Cloudflare Access identity verification', () => {
  it('fails closed without an exact team issuer, audience, and email allowlist', () => {
    expect(accessConfiguration({})).toBeNull();
    expect(accessConfiguration({ CLASTERIA_ACCESS_ISSUER: 'http://attacker.test', CLASTERIA_ACCESS_AUD: 'app', CLASTERIA_EDITOR_ALLOWED_EMAILS: 'a@b.test' })).toBeNull();
    expect(accessConfiguration({ CLASTERIA_ACCESS_ISSUER: issuer, CLASTERIA_ACCESS_AUD: 'app', CLASTERIA_EDITOR_ALLOWED_EMAILS: '*' })).toBeNull();
  });
  it('accepts a signed, allowed application identity and stores only an opaque stable owner', async () => {
    const owner = await verifyEditorIdentity(request(await token()), config);
    expect(owner).toMatch(/^[a-f0-9]{64}$/);
    expect(await verifyEditorIdentity(request(await token()), config)).toBe(owner);
  });
  it('rejects missing or forged tokens and unsigned email headers', async () => {
    expect(await verifyEditorIdentity(request(), config)).toBeNull();
    const unsigned = new Request('https://preview.pages.dev', { headers: { 'Cf-Access-Authenticated-User-Email': 'editor@pixelsia.net' } });
    expect(await verifyEditorIdentity(unsigned, config)).toBeNull();
    expect(await verifyEditorIdentity(request(await token({}, otherKey)), config)).toBeNull();
    expect(await verifyEditorIdentity(request('not-a-jwt'), config)).toBeNull();
  });
  it('rejects other identities, service tokens, audiences, and issuers', async () => {
    expect(await verifyEditorIdentity(request(await token({ email: 'other@pixelsia.net' })), config)).toBeNull();
    expect(await verifyEditorIdentity(request(await token({ type: 'service' })), config)).toBeNull();
    expect(await verifyEditorIdentity(request(await token()), { ...config, audience: 'other-app' })).toBeNull();
    expect(await verifyEditorIdentity(request(await token()), { ...config, issuer: 'https://other.cloudflareaccess.com' })).toBeNull();
  });
  it('rejects expired, not-yet-valid, or expiration-less tokens', async () => {
    for (const claims of [{ exp: 1 }, { nbf: Math.floor(Date.now() / 1000) + 3600 }, {}]) {
      const jwt = await new SignJWT({ type: 'app', email: 'editor@pixelsia.net', ...claims })
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setSubject('user-1')
        .setIssuer(issuer).setAudience('test-app').setIssuedAt().sign(privateKey);
      expect(await verifyEditorIdentity(request(jwt), config)).toBeNull();
    }
  });
});

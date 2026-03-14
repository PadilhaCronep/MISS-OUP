import crypto from 'crypto';

interface AuthTokenPayload {
  sub: string;
  iat: number;
  exp: number;
}

const DEFAULT_TTL_SECONDS = 60 * 60 * 12;
const DEFAULT_SECRET = 'missao-dev-secret-change-me';

function getSecret(): string {
  return process.env.AUTH_SECRET?.trim() || DEFAULT_SECRET;
}

function getTtlSeconds(): number {
  const parsed = Number(process.env.AUTH_TOKEN_TTL_SECONDS);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TTL_SECONDS;
  return Math.floor(parsed);
}

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function sign(encodedPayload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url');
}

function timingSafeEquals(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);

  if (ba.length !== bb.length) return false;

  try {
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function createAuthToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthTokenPayload = {
    sub: userId,
    iat: now,
    exp: now + getTtlSeconds(),
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  if (!token || typeof token !== 'string') return null;

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  if (!timingSafeEquals(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as Partial<AuthTokenPayload>;
    if (!payload?.sub || typeof payload.sub !== 'string') return null;

    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) return null;

    return {
      sub: payload.sub,
      iat: payload.iat ?? now,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

const authBaseUrl = process.env.NEON_AUTH_BASE_URL || 'https://ep-damp-sunset-bah0etdc.neonauth.c-8.eu-central-1.aws.neon.tech/neondb/auth';
const jwks = createRemoteJWKSet(new URL('https://ep-damp-sunset-bah0etdc.neonauth.c-8.eu-central-1.aws.neon.tech/neondb/auth/.well-known/jwks.json'));

export type AuthenticatedUser = { id: string; email: string };

export async function authenticateRequest(req: any): Promise<AuthenticatedUser | null> {
  const header = String(req.headers?.authorization || '');
  if (!header.startsWith('Bearer ')) return null;
  try {
    const { payload } = await jwtVerify(header.slice(7), jwks, { issuer: authBaseUrl });
    const claims = payload as JWTPayload & { email?: string };
    if (!claims.sub) return null;
    return { id: claims.sub, email: typeof claims.email === 'string' ? claims.email.toLowerCase() : '' };
  } catch {
    return null;
  }
}

export function isAdmin(user: AuthenticatedUser): boolean {
  const allowed = (process.env.ADMIN_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  return !!user.email && allowed.includes(user.email);
}

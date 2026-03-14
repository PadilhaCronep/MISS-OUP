import type { NextFunction, Request, Response } from 'express';
import { db } from '../../db/index.js';
import { buildActor, hasRole, type AccessRole, type AuthActor } from '../../lib/authorization.js';
import { verifyAuthToken } from '../../lib/auth-token.js';

export interface AuthRequest extends Request {
  auth?: AuthActor;
  userId?: string;
  userRole?: string;
}

function parseBooleanFlag(value: string | undefined, fallback: boolean): boolean {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

const AUTH_DEV_MODE_ENABLED = parseBooleanFlag(
  process.env.AUTH_DEV_MODE,
  process.env.NODE_ENV !== 'production',
);

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;

  const [scheme, value] = header.split(' ');
  if (!scheme || !value) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  return value;
}

function getDevUserId(req: Request): string | null {
  if (!AUTH_DEV_MODE_ENABLED) return null;

  const raw = req.headers['x-dev-user-id'];
  if (!raw) return null;

  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function loadActorByUserId(userId: string): AuthActor | null {
  const user = db
    .prepare('SELECT id, name, email, state, city, role FROM volunteers WHERE id = ?')
    .get(userId) as
    | { id: string; name: string; email: string; state: string | null; city: string | null; role: string | null }
    | undefined;

  if (!user) return null;

  const bindings = db
    .prepare(
      `SELECT role, scope_type, scope_ref, office_context
       FROM access_bindings
       WHERE user_id = ? AND is_active = 1`,
    )
    .all(userId) as Array<{
    role: string;
    scope_type: string;
    scope_ref: string | null;
    office_context: string | null;
  }>;

  return buildActor({
    id: user.id,
    name: user.name,
    email: user.email,
    state: user.state,
    city: user.city,
    legacyRole: user.role,
    bindings,
  });
}

function attachActorToRequest(req: AuthRequest, actor: AuthActor): void {
  req.auth = actor;
  req.userId = actor.id;
  req.userRole = actor.bindings[0]?.role ?? actor.legacyRole ?? 'VOLUNTARIO';
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = getBearerToken(req);

  if (!token) {
    const devUserId = getDevUserId(req);
    if (devUserId) {
      const devActor = loadActorByUserId(devUserId);
      if (!devActor) {
        res.status(401).json({ error: 'Usuario de desenvolvimento nao encontrado' });
        return;
      }

      attachActorToRequest(req, devActor);
      next();
      return;
    }

    res.status(401).json({ error: 'Nao autenticado' });
    return;
  }

  const payload = verifyAuthToken(token);
  if (!payload?.sub) {
    res.status(401).json({ error: 'Sessao invalida ou expirada' });
    return;
  }

  const actor = loadActorByUserId(payload.sub);
  if (!actor) {
    res.status(401).json({ error: 'Usuario da sessao nao encontrado' });
    return;
  }

  attachActorToRequest(req, actor);
  next();
}

export function requireRole(...roles: AccessRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const actor = req.auth;

    if (!actor) {
      res.status(401).json({ error: 'Nao autenticado' });
      return;
    }

    if (!hasRole(actor, roles)) {
      res.status(403).json({ error: 'Sem permissao para esta acao' });
      return;
    }

    next();
  };
}

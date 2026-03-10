import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../../types/index.js';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: UserRole;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const userId = req.headers['x-user-id'];

  if (!userId || typeof userId !== 'string') {
    res.status(401).json({ error: 'Nao autenticado' });
    return;
  }

  req.userId = userId;
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const role = req.headers['x-user-role'];
    const userRole = typeof role === 'string' ? (role as UserRole) : undefined;

    if (!userRole || !roles.includes(userRole)) {
      res.status(403).json({ error: 'Sem permissao para esta acao' });
      return;
    }

    req.userRole = userRole;
    next();
  };
}

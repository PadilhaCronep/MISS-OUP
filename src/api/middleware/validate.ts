import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

export const validateBody =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Dados invalidos',
        campos: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    req.body = parsed.data;
    next();
  };

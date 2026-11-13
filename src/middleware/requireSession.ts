import type { RequestHandler } from "express";
import type { Pool } from "pg";
import { HttpError } from "../shared/HttpError.js";
import { hashSessionToken } from "../security/security.js";

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
}

export const requireSession = (pool: Pool): RequestHandler => async (request, response, next) => {
  const authorization = request.get("authorization");
  const match = authorization?.match(/^Bearer\s+([A-Za-z0-9_-]+)$/);
  if (!match) {
    next(new HttpError(401, "Faça login para continuar."));
    return;
  }

  try {
    const token = match[1]!;
    const result = await pool.query<AuthenticatedUser>(
      `SELECT u.id, u.nome AS name, u.email
       FROM sessoes s
       JOIN usuarios u ON u.id = s.usuario_id
       WHERE s.token_hash = $1 AND s.expira_em > NOW() AND u.ativo = TRUE`,
      [hashSessionToken(token)],
    );
    const user = result.rows[0];
    if (!user) {
      next(new HttpError(401, "Sessão inválida ou expirada. Faça login novamente."));
      return;
    }

    response.locals.user = user;
    response.locals.sessionTokenHash = hashSessionToken(token);
    next();
  } catch (error) {
    next(error);
  }
};
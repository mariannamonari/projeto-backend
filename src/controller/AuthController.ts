import type { RequestHandler } from "express";
import type { Pool } from "pg";
import { createSessionToken, hashSessionToken, verifyPassword } from "../security/security.js";
import { HttpError } from "../shared/HttpError.js";

interface UserRow {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
}

export class AuthController {
  constructor(private readonly pool: Pool) {}

  login: RequestHandler = async (request, response, next) => {
    try {
      const { email, password } = request.body ?? {};
      if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
        throw new HttpError(400, "Informe e-mail e senha.");
      }

      const result = await this.pool.query<UserRow>(
        `SELECT id, nome AS name, email, senha_hash AS "passwordHash"
         FROM usuarios WHERE LOWER(email) = LOWER($1) AND ativo = TRUE`,
        [email.trim()],
      );
      const user = result.rows[0];
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        throw new HttpError(401, "E-mail ou senha incorretos.");
      }

      const token = createSessionToken();
      const ttlHours = Number(process.env.SESSION_TTL_HOURS ?? 8);
      const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
      await this.pool.query("DELETE FROM sessoes WHERE expira_em <= NOW()");
      await this.pool.query(
        "INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES ($1, $2, $3)",
        [hashSessionToken(token), user.id, expiresAt],
      );

      response.json({
        token,
        expiresAt: expiresAt.toISOString(),
        user: { id: user.id, name: user.name, email: user.email },
      });
    } catch (error) {
      next(error);
    }
  };

  me: RequestHandler = (_request, response) => {
    response.json({ user: response.locals.user });
  };

  logout: RequestHandler = async (_request, response, next) => {
    try {
      await this.pool.query("DELETE FROM sessoes WHERE token_hash = $1", [response.locals.sessionTokenHash]);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  };
}
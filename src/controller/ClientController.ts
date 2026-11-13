import type { RequestHandler } from "express";
import type { Pool } from "pg";
import { cpfLookupHash, encryptCpf, normalizeCpf } from "../security/security.js";
import { HttpError } from "../shared/HttpError.js";

interface ClientInput {
  name: string;
  email: string;
  cpf: string | undefined;
  phone: string;
}

function parseClient(body: unknown, requireCpf = true): ClientInput {
  if (!body || typeof body !== "object") throw new HttpError(400, "Informe os dados do cliente.");
  const record = body as Record<string, unknown>;
  const { name, email, cpf, phone } = record;
  if ([name, email, phone].some((value) => typeof value !== "string" || !value.trim())) {
    throw new HttpError(400, "Nome, e-mail e telefone são obrigatórios.");
  }
  const normalizedCpf = typeof cpf === "string" && cpf.trim() ? normalizeCpf(cpf) : undefined;
  if (requireCpf && !normalizedCpf) throw new HttpError(400, "CPF é obrigatório para cadastrar o cliente.");
  if (normalizedCpf && !/^\d{11}$/.test(normalizedCpf)) throw new HttpError(400, "CPF deve conter 11 números.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email as string).trim())) {
    throw new HttpError(400, "Informe um e-mail válido.");
  }
  return {
    name: (name as string).trim(),
    email: (email as string).trim().toLowerCase(),
    cpf: normalizedCpf,
    phone: (phone as string).trim(),
  };
}

export class ClientController {
  constructor(private readonly pool: Pool) {}

  list: RequestHandler = async (request, response, next) => {
    try {
      const search = typeof request.query.q === "string" ? request.query.q.trim() : "";
      const result = await this.pool.query(
        `SELECT id, nome AS name, email, telefone AS phone, criado_em AS "createdAt"
         FROM clientes
         WHERE $1 = '' OR nome ILIKE $2 OR email ILIKE $2 OR telefone ILIKE $2
         ORDER BY nome ASC`,
        [search, `%${search}%`],
      );
      response.json({ data: result.rows });
    } catch (error) {
      next(error);
    }
  };

  create: RequestHandler = async (request, response, next) => {
    try {
      const client = parseClient(request.body);
      const result = await this.pool.query(
        `INSERT INTO clientes (nome, email, cpf_criptografado, cpf_hash, telefone)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, nome AS name, email, telefone AS phone`,
        [client.name, client.email, encryptCpf(client.cpf!), cpfLookupHash(client.cpf!), client.phone],
      );
      response.status(201).json({ data: result.rows[0] });
    } catch (error) {
      next(error);
    }
  };

  update: RequestHandler = async (request, response, next) => {
    try {
      const id = Number(request.params.id);
      if (!Number.isInteger(id) || id < 1) throw new HttpError(400, "Identificador de cliente inválido.");
      const client = parseClient(request.body, false);
      const result = await this.pool.query(
        `UPDATE clientes
         SET nome = $1, email = $2,
             cpf_criptografado = CASE WHEN $3::text IS NULL THEN cpf_criptografado ELSE $3 END,
             cpf_hash = CASE WHEN $4::text IS NULL THEN cpf_hash ELSE $4 END,
             telefone = $5
         WHERE id = $6
         RETURNING id, nome AS name, email, telefone AS phone`,
        [client.name, client.email, client.cpf ? encryptCpf(client.cpf) : null, client.cpf ? cpfLookupHash(client.cpf) : null, client.phone, id],
      );
      if (!result.rows[0]) throw new HttpError(404, "Cliente não encontrado.");
      response.json({ data: result.rows[0] });
    } catch (error) {
      next(error);
    }
  };

  remove: RequestHandler = async (request, response, next) => {
    try {
      const id = Number(request.params.id);
      if (!Number.isInteger(id) || id < 1) throw new HttpError(400, "Identificador de cliente inválido.");
      const result = await this.pool.query("DELETE FROM clientes WHERE id = $1 RETURNING id", [id]);
      if (!result.rowCount) throw new HttpError(404, "Cliente não encontrado.");
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  };
}
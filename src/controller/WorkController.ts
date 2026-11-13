import type { RequestHandler } from "express";
import type { Pool } from "pg";
import { HttpError } from "../shared/HttpError.js";

const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

export class WorkController {
  constructor(private readonly pool: Pool) {}

  listEquipment: RequestHandler = async (_request, response, next) => {
    try {
      const result = await this.pool.query(
        `SELECT e.id, e.tipo AS type, e.marca AS brand, e.modelo AS model,
                e.numero_serie AS "serialNumber", e.descricao AS description,
                e.cliente_id AS "clientId", c.nome AS "clientName"
         FROM equipamentos e JOIN clientes c ON c.id = e.cliente_id
         ORDER BY c.nome ASC, e.tipo ASC`,
      );
      response.json({ data: result.rows });
    } catch (error) {
      next(error);
    }
  };

  createEquipment: RequestHandler = async (request, response, next) => {
    try {
      const { clientId, type, brand, model, serialNumber, description } = request.body ?? {};
      const parsedClientId = Number(clientId);
      if (!Number.isInteger(parsedClientId) || parsedClientId < 1) {
        throw new HttpError(400, "Selecione um cliente existente para o equipamento.");
      }
      if (![type, brand, model, serialNumber].every(text)) {
        throw new HttpError(400, "Tipo, marca, modelo e número de série são obrigatórios.");
      }

      const result = await this.pool.query(
        `INSERT INTO equipamentos (cliente_id, tipo, marca, modelo, numero_serie, descricao)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, cliente_id AS "clientId", tipo AS type, marca AS brand,
                   modelo AS model, numero_serie AS "serialNumber", descricao AS description`,
        [parsedClientId, type.trim(), brand.trim(), model.trim(), serialNumber.trim(), text(description) ? description.trim() : null],
      );
      response.status(201).json({ data: result.rows[0] });
    } catch (error) {
      next(error);
    }
  };

  listAppointments: RequestHandler = async (_request, response, next) => {
    try {
      const result = await this.pool.query(
        `SELECT a.id, a.data_agendamento AS "scheduledAt", a.descricao AS description,
                a.status AS status, e.id AS "equipmentId", e.tipo AS "equipmentType",
                e.marca AS "equipmentBrand", e.modelo AS "equipmentModel",
                e.numero_serie AS "serialNumber", c.id AS "clientId", c.nome AS "clientName",
                c.telefone AS "clientPhone"
         FROM agendamentos a
         JOIN equipamentos e ON e.id = a.equipamento_id
         JOIN clientes c ON c.id = e.cliente_id
         ORDER BY a.data_agendamento ASC`,
      );
      response.json({ data: result.rows });
    } catch (error) {
      next(error);
    }
  };

  updateAppointmentDate: RequestHandler = async (request, response, next) => {
    try {
      const id = Number(request.params.id);
      const { scheduledAt } = request.body ?? {};
      if (!Number.isInteger(id) || id < 1) throw new HttpError(400, "Identificador de agendamento inválido.");
      if (!text(scheduledAt) || Number.isNaN(Date.parse(scheduledAt))) {
        throw new HttpError(400, "Informe uma data e hora válidas para o agendamento.");
      }

      const result = await this.pool.query(
        `UPDATE agendamentos SET data_agendamento = $1 WHERE id = $2
         RETURNING id, data_agendamento AS "scheduledAt"`,
        [new Date(scheduledAt), id],
      );
      if (!result.rows[0]) throw new HttpError(404, "Agendamento não encontrado.");
      response.json({ data: result.rows[0] });
    } catch (error) {
      next(error);
    }
  };
}
import type { Request, RequestHandler } from "express";
import { CatalogModel, type ProductFilters } from "../model/CatalogModel.js";

const skinTypes = new Set(["todos", "seca", "oleosa", "mista", "sensivel", "madura"]);

class QueryValidationError extends Error {}

function queryString(request: Request, key: string): string | undefined {
  const value = request.query[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function queryNumber(request: Request, key: string): number | undefined {
  const value = queryString(request, key);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new QueryValidationError(`O parâmetro '${key}' deve ser um número maior ou igual a zero.`);
  }
  return parsed;
}

function parseFilters(request: Request): ProductFilters {
  const page = Number(queryString(request, "page") ?? 1);
  const limit = Number(queryString(request, "limit") ?? 12);
  const skinType = queryString(request, "skinType");
  const availableQuery = queryString(request, "available");

  if (!Number.isInteger(page) || page < 1) throw new QueryValidationError("O parâmetro 'page' deve ser um inteiro positivo.");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new QueryValidationError("O parâmetro 'limit' deve ser um inteiro entre 1 e 100.");
  }
  if (skinType && !skinTypes.has(skinType)) throw new QueryValidationError("O parâmetro 'skinType' não é válido.");
  if (availableQuery && availableQuery !== "true" && availableQuery !== "false") {
    throw new QueryValidationError("O parâmetro 'available' deve ser true ou false.");
  }

  const minPrice = queryNumber(request, "minPrice");
  const maxPrice = queryNumber(request, "maxPrice");
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new QueryValidationError("'minPrice' não pode ser maior que 'maxPrice'.");
  }

  return {
    search: queryString(request, "search"),
    category: queryString(request, "category"),
    brand: queryString(request, "brand"),
    skinType,
    available: availableQuery === undefined ? undefined : availableQuery === "true",
    minPrice,
    maxPrice,
    limit,
    offset: (page - 1) * limit,
  };
}

export class CatalogController {
  constructor(private readonly catalog: CatalogModel) {}

  listProducts: RequestHandler = async (request, response, next) => {
    try {
      const filters = parseFilters(request);
      const { products, total } = await this.catalog.listProducts(filters);
      response.json({
        data: products,
        pagination: {
          page: Math.floor(filters.offset / filters.limit) + 1,
          limit: filters.limit,
          total,
          totalPages: Math.ceil(total / filters.limit),
        },
      });
    } catch (error) {
      if (error instanceof QueryValidationError) {
        response.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  getProduct: RequestHandler = async (request, response, next) => {
    try {
      const id = Number(request.params.id);
      if (!Number.isInteger(id) || id < 1) {
        response.status(400).json({ error: "O identificador do produto é inválido." });
        return;
      }

      const product = await this.catalog.findProductById(id);
      if (!product) {
        response.status(404).json({ error: "Produto não encontrado." });
        return;
      }
      response.json({ data: product });
    } catch (error) {
      next(error);
    }
  };

  listCategories: RequestHandler = async (_request, response, next) => {
    try {
      response.json({ data: await this.catalog.listCategories() });
    } catch (error) {
      next(error);
    }
  };

  listBrands: RequestHandler = async (_request, response, next) => {
    try {
      response.json({ data: await this.catalog.listBrands() });
    } catch (error) {
      next(error);
    }
  };
}
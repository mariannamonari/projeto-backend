import type { Pool } from "pg";

export interface ProductFilters {
  search: string | undefined;
  category: string | undefined;
  brand: string | undefined;
  skinType: string | undefined;
  available: boolean | undefined;
  minPrice: number | undefined;
  maxPrice: number | undefined;
  limit: number;
  offset: number;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  brand: string;
  category: string;
  skinType: string;
  price: number;
  stock: number;
  available: boolean;
  averageRating: number | null;
  reviewCount: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Brand {
  id: number;
  name: string;
}

interface ProductRow {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  brand: string;
  category: string;
  skin_type: string;
  price: string;
  stock: number;
  available: boolean;
  average_rating: string | null;
  review_count: string;
}

export class CatalogModel {
  constructor(private readonly pool: Pool) {}

  async listProducts(filters: ProductFilters): Promise<{ products: Product[]; total: number }> {
    const conditions = ["p.ativo = TRUE"];
    const values: Array<string | number | boolean> = [];
    const addCondition = (condition: string, value: string | number | boolean): void => {
      values.push(value);
      conditions.push(condition.replace("?", `$${values.length}`));
    };

    if (filters.search) {
      values.push(`%${filters.search}%`);
      const placeholder = `$${values.length}`;
      conditions.push(`(p.nome ILIKE ${placeholder} OR p.descricao ILIKE ${placeholder} OR p.sku ILIKE ${placeholder})`);
    }
    if (filters.category) addCondition("c.slug = ?", filters.category);
    if (filters.brand) addCondition("m.nome ILIKE ?", filters.brand);
    if (filters.skinType) addCondition("p.tipo_pele = ?", filters.skinType);
    if (filters.available !== undefined) addCondition("(p.estoque > 0) = ?", filters.available);
    if (filters.minPrice !== undefined) addCondition("COALESCE(p.preco_promocional, p.preco) >= ?", filters.minPrice);
    if (filters.maxPrice !== undefined) addCondition("COALESCE(p.preco_promocional, p.preco) <= ?", filters.maxPrice);

    const where = conditions.join(" AND ");
    const countResult = await this.pool.query<{ total: string }>(
      `SELECT COUNT(*) AS total
       FROM produtos p
       JOIN marcas m ON m.id = p.marca_id
       JOIN categorias c ON c.id = p.categoria_id
       WHERE ${where}`,
      values,
    );

    const pageValues = [...values, filters.limit, filters.offset];
    const result = await this.pool.query<ProductRow>(
      `SELECT p.id, p.sku, p.nome AS name, p.descricao AS description,
              m.nome AS brand, c.nome AS category, p.tipo_pele AS skin_type,
              COALESCE(p.preco_promocional, p.preco)::text AS price,
              p.estoque AS stock, (p.estoque > 0) AS available,
              ROUND(AVG(a.nota)::numeric, 1)::text AS average_rating,
              COUNT(a.id)::text AS review_count
       FROM produtos p
       JOIN marcas m ON m.id = p.marca_id
       JOIN categorias c ON c.id = p.categoria_id
       LEFT JOIN avaliacoes a ON a.produto_id = p.id
       WHERE ${where}
       GROUP BY p.id, m.nome, c.nome
       ORDER BY p.nome ASC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      pageValues,
    );

    return {
      products: result.rows.map((row) => this.toProduct(row)),
      total: Number(countResult.rows[0]?.total ?? 0),
    };
  }

  async findProductById(id: number): Promise<Product | null> {
    const result = await this.pool.query<ProductRow>(
      `SELECT p.id, p.sku, p.nome AS name, p.descricao AS description,
              m.nome AS brand, c.nome AS category, p.tipo_pele AS skin_type,
              COALESCE(p.preco_promocional, p.preco)::text AS price,
              p.estoque AS stock, (p.estoque > 0) AS available,
              ROUND(AVG(a.nota)::numeric, 1)::text AS average_rating,
              COUNT(a.id)::text AS review_count
       FROM produtos p
       JOIN marcas m ON m.id = p.marca_id
       JOIN categorias c ON c.id = p.categoria_id
       LEFT JOIN avaliacoes a ON a.produto_id = p.id
       WHERE p.id = $1 AND p.ativo = TRUE
       GROUP BY p.id, m.nome, c.nome`,
      [id],
    );

    const row = result.rows[0];
    return row ? this.toProduct(row) : null;
  }

  async listCategories(): Promise<Category[]> {
    const result = await this.pool.query<Category>(
      "SELECT id, nome AS name, slug FROM categorias ORDER BY nome ASC",
    );
    return result.rows;
  }

  async listBrands(): Promise<Brand[]> {
    const result = await this.pool.query<Brand>(
      "SELECT id, nome AS name FROM marcas ORDER BY nome ASC",
    );
    return result.rows;
  }

  private toProduct(row: ProductRow): Product {
    return {
      id: row.id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      brand: row.brand,
      category: row.category,
      skinType: row.skin_type,
      price: Number(row.price),
      stock: row.stock,
      available: row.available,
      averageRating: row.average_rating === null ? null : Number(row.average_rating),
      reviewCount: Number(row.review_count),
    };
  }
}
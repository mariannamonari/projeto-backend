import { Pool, type PoolConfig } from "pg";

/** Model responsible for PostgreSQL connection management. */
export class DatabaseModel {
  private readonly _pool: Pool;

  constructor() {
    const requiredVariables = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD", "CPF_ENCRYPTION_KEY"] as const;
    const missingVariables = requiredVariables.filter((name) => !process.env[name]);

    if (missingVariables.length > 0) {
      throw new Error(`Missing database environment variables: ${missingVariables.join(", ")}`);
    }

    if (!/^[\da-fA-F]{64}$/.test(process.env.CPF_ENCRYPTION_KEY ?? "")) {
      throw new Error("CPF_ENCRYPTION_KEY must contain exactly 64 hexadecimal characters");
    }
    const sessionTtlHours = Number(process.env.SESSION_TTL_HOURS ?? 8);
    if (!Number.isInteger(sessionTtlHours) || sessionTtlHours < 1 || sessionTtlHours > 168) {
      throw new Error("SESSION_TTL_HOURS must be an integer between 1 and 168");
    }

    const port = Number(process.env.DB_PORT ?? 5432);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error("DB_PORT must be a valid port number between 1 and 65535");
    }

    const config: PoolConfig = {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port,
      max: 10,
      idleTimeoutMillis: 10_000,
    };

    this._pool = new Pool(config);
  }

  /** Checks database connectivity while keeping the pool available for queries. */
  public async testeConexao(): Promise<boolean> {
    try {
      await this._pool.query("SELECT 1");
      console.log("Database connected!");
      return true;
    } catch (error) {
      console.error("Error connecting to the database:", error);
      return false;
    }
  }

  public get pool(): Pool {
    return this._pool;
  }
}
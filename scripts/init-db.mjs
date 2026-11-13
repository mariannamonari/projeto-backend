import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const required = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Configure no .env as variaveis: ${missing.join(", ")}`);
  process.exit(1);
}

if (process.env.CONFIRM_RESET !== "YES") {
  console.error("Este script remove e recria as tabelas usuarios, sessoes, clientes, equipamentos e agendamentos.");
  console.error("Para confirmar, rode o comando com CONFIRM_RESET=YES. Use somente em banco vazio ou descartavel.");
  process.exit(1);
}

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 5000,
});

try {
  const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "init.sql");
  const sql = await readFile(file, "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql.replace(/^\s*BEGIN\s*;/i, "").replace(/COMMIT\s*;\s*$/i, ""));
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  console.log(`Banco '${process.env.DB_NAME}' preparado com sucesso.`);
  console.log("ATENCAO: init.sql remove e recria as tabelas do sistema.");
} catch {
  console.error("Falha ao inicializar o banco. Confira PostgreSQL, DB_NAME e o arquivo init.sql.");
  process.exitCode = 1;
} finally {
  await pool.end();
}

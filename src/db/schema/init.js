import path from "node:path";
import { fileURLToPath } from "node:url";
import { applySchema } from "mbkauthe";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initializes PostgreSQL schema for blogmbktech.
 * @param {import("pg").Pool} pool
 */
export async function initPostgresSchema(pool) {
  if (!pool) return;
  const schemaPath = path.join(__dirname, "postgres.sql");
  await applySchema(pool, schemaPath, { name: "blogmbktech-postgres" });
  console.log("[blogmbktech] PostgreSQL schema initialized successfully.");
}

/**
 * Initializes SQLite schema for blogmbktech.
 * @param {object} db - Sqlite handle or adapter
 */
export async function initSqliteSchema(db) {
  if (!db) return;
  const schemaPath = path.join(__dirname, "sqlite.sql");
  await applySchema(db, schemaPath, { name: "blogmbktech-sqlite" });
  console.log("[blogmbktech] SQLite schema initialized successfully.");
}

export default { initPostgresSchema, initSqliteSchema };

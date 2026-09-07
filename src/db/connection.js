import pkg from "pg";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { applySchema, registerGracefulShutdown } from "mbkauthe";

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../");

dotenv.config();

export const dbType = (process.env.DB_TYPE || "postgres").toLowerCase();

/** Path to SQLite database file (used when DB_TYPE=sqlite). */
export const sqlitePath = process.env.SQLITE_PATH || path.join(ROOT_DIR, "data", "blogmbktech.db");

// Ensure data directory exists if using SQLite file path
if (dbType === "sqlite" && sqlitePath !== ":memory:") {
  const dir = path.dirname(path.resolve(sqlitePath));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const idleTimeoutMillisV = 60000; // 60 seconds
const connectionTimeoutMillisV = 50000; // 50 seconds

// PostgreSQL connection pool configuration
export const poolConfig = {
  connectionString: process.env.NEON_POSTGRES,
  ssl: {
    rejectUnauthorized: true,
  },
  max: 20,
  idleTimeoutMillis: idleTimeoutMillisV,
  connectionTimeoutMillis: connectionTimeoutMillisV,
};

const dummyPool = {
  query: async () => ({ rows: [], rowCount: 0 }),
  connect: async () => ({ query: async () => ({ rows: [], rowCount: 0 }), release: () => {} }),
  on: () => {},
  end: async () => {},
};

export const pool = dbType !== "sqlite" ? new Pool(poolConfig) : dummyPool;

if (dbType !== "sqlite" && pool) {
  registerGracefulShutdown(pool);
}

function ensureSqliteUserColumns(target) {
  try {
    const db = target.db || target;
    if (typeof db.prepare === "function") {
      const cols = db.prepare("PRAGMA table_info(mbkcore_users)").all().map((c) => c.name);
      if (cols.length > 0) {
        if (!cols.includes("last_login")) db.exec("ALTER TABLE mbkcore_users ADD COLUMN last_login TEXT");
        if (!cols.includes("password_hash")) db.exec("ALTER TABLE mbkcore_users ADD COLUMN password_hash TEXT");
        if (!cols.includes("full_name")) db.exec("ALTER TABLE mbkcore_users ADD COLUMN full_name TEXT");
        if (!cols.includes("bio")) db.exec("ALTER TABLE mbkcore_users ADD COLUMN bio TEXT DEFAULT 'I am ....'");
        if (!cols.includes("allowed_apps")) db.exec("ALTER TABLE mbkcore_users ADD COLUMN allowed_apps TEXT DEFAULT '[\"Portal\", \"mbkauthe\"]'");
        if (!cols.includes("social_accounts")) db.exec("ALTER TABLE mbkcore_users ADD COLUMN social_accounts TEXT DEFAULT '{}'");
        if (!cols.includes("positions")) db.exec("ALTER TABLE mbkcore_users ADD COLUMN positions TEXT DEFAULT '{\"Not_Permanent\": \"Member Is Not Permanent\"}'");
        if (!cols.includes("is_active")) db.exec("ALTER TABLE mbkcore_users ADD COLUMN is_active INTEGER DEFAULT 1");
      }
    }
  } catch {}
}

export async function initSchema(target = pool) {
  try {
    const isSqlite = dbType === "sqlite" || (target && target.dialect && target.dialect.name === "sqlite");
    if (isSqlite && target) {
      ensureSqliteUserColumns(target);
    }
    const schemaFile = isSqlite ? "schema/schema.sqlite.sql" : "schema/schema.sql";
    const schemaPath = path.resolve(__dirname, schemaFile);
    if (target) {
      await applySchema(target, schemaPath, { name: "blogmbktech" });
    }
  } catch (err) {
    console.error("Schema init error:", err.message || err);
  }
}

// Test database connection on startup (skip during tests or when using SQLite)
if (dbType !== "sqlite" && process.env.NODE_ENV !== "test" && !process.env.JEST_WORKER_ID && pool) {
  (async () => {
    try {
      const client = await pool.connect();
      console.log("Connected to neon PostgreSQL database (pool)!");
      client.release();
    } catch (err) {
      console.error("Database connection error (pool):", err.message || err);
    }
  })();
}

export default pool;

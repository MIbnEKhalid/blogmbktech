import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { SqliteAdapter, applySchema } from 'mbkauthe';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const SCHEMA_PATH = path.join(ROOT_DIR, 'src', 'db', 'schema', 'schema.sqlite.sql');

// Priority: CLI argument (excluding flags) > process.env.SQLITE_PATH > default path
const args = process.argv.slice(2);
const customPath = args.find((arg) => !arg.startsWith('-'));
const dbPath = customPath || process.env.SQLITE_PATH || path.join(ROOT_DIR, 'data', 'blogmbktech.db');
const isReset = args.includes('--reset') || args.includes('--force');

async function initSqliteDb() {
  console.log(`[init-sqlite] Target database: ${dbPath}`);

  if (dbPath !== ':memory:') {
    const resolvedPath = path.resolve(dbPath);
    const dir = path.dirname(resolvedPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[init-sqlite] Created directory: ${dir}`);
    }

    if (isReset && fs.existsSync(resolvedPath)) {
      console.log(`[init-sqlite] Resetting database file: ${resolvedPath}`);
      fs.unlinkSync(resolvedPath);
    }
  }

  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`[init-sqlite] Schema file not found: ${SCHEMA_PATH}`);
    process.exit(1);
  }

  const adapter = new SqliteAdapter(dbPath);

  try {
    // Ensure all required columns exist in mbkcore_users if it was already created
    try {
      const cols = adapter.db.prepare("PRAGMA table_info(mbkcore_users)").all().map((c) => c.name);
      if (cols.length > 0) {
        if (!cols.includes("last_login")) adapter.db.exec("ALTER TABLE mbkcore_users ADD COLUMN last_login TEXT");
        if (!cols.includes("password_hash")) adapter.db.exec("ALTER TABLE mbkcore_users ADD COLUMN password_hash TEXT");
        if (!cols.includes("full_name")) adapter.db.exec("ALTER TABLE mbkcore_users ADD COLUMN full_name TEXT");
        if (!cols.includes("bio")) adapter.db.exec("ALTER TABLE mbkcore_users ADD COLUMN bio TEXT DEFAULT 'I am ....'");
        if (!cols.includes("allowed_apps")) adapter.db.exec("ALTER TABLE mbkcore_users ADD COLUMN allowed_apps TEXT DEFAULT '[\"Portal\", \"mbkauthe\"]'");
        if (!cols.includes("social_accounts")) adapter.db.exec("ALTER TABLE mbkcore_users ADD COLUMN social_accounts TEXT DEFAULT '{}'");
        if (!cols.includes("positions")) adapter.db.exec("ALTER TABLE mbkcore_users ADD COLUMN positions TEXT DEFAULT '{\"Not_Permanent\": \"Member Is Not Permanent\"}'");
        if (!cols.includes("is_active")) adapter.db.exec("ALTER TABLE mbkcore_users ADD COLUMN is_active INTEGER DEFAULT 1");
      }
    } catch {}

    console.log(`[init-sqlite] Applying SQLite schema from: ${SCHEMA_PATH}`);
    await applySchema(adapter, SCHEMA_PATH, { name: 'blogmbktech-sqlite' });

    // Inspect created tables
    const tables = adapter.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map((t) => t.name);

    console.log(`[init-sqlite] Successfully initialized ${tables.length} tables:`, tables.join(', '));
  } catch (err) {
    console.error('[init-sqlite] Failed to initialize SQLite database:', err.message || err);
    process.exit(1);
  } finally {
    adapter.close();
  }
}

initSqliteDb();

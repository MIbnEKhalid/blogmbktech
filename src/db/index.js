import { PostgresAdapter, SqliteAdapter, postgresDialect, sqliteDialect, BaseRepository, registerGracefulShutdown } from "mbkauthe";
import { pool, poolConfig, sqlitePath, dbType } from "./connection.js";
import { initPostgresSchema, initSqliteSchema } from "./schema/init.js";

let defaultAdapter;

if (dbType === "sqlite") {
  const adapter = new SqliteAdapter(sqlitePath, {
    dialect: sqliteDialect,
    jsonColumns: ["category_ids", "category_names", "sess"],
    booleanColumns: ["published", "is_approved", "active", "is_active", "have_mail_account"],
  });
  registerGracefulShutdown(adapter);
  defaultAdapter = adapter;
} else {
  defaultAdapter = new PostgresAdapter(pool, postgresDialect);
}

export const adapter = defaultAdapter;

export {
  defaultAdapter,
  pool,
  poolConfig,
  sqlitePath,
  dbType,
  initPostgresSchema,
  initSqliteSchema,
  PostgresAdapter,
  postgresDialect,
  SqliteAdapter,
  sqliteDialect,
  BaseRepository,
};

export default defaultAdapter;

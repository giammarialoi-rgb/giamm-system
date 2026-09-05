import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_MIGRATIONS_DIR = path.join(__dirname, "migrations");
const MIGRATION_LOCK_ID = 191747341;

function checksum(sql) {
  return crypto.createHash("sha256").update(sql).digest("hex");
}

export async function loadMigrationFiles(migrationsDir = DEFAULT_MIGRATIONS_DIR) {
  const names = (await fs.readdir(migrationsDir))
    .filter((name) => /^\d{4}_[a-z0-9_-]+\.sql$/i.test(name))
    .sort();
  const migrations = [];
  for (const name of names) {
    const sql = await fs.readFile(path.join(migrationsDir, name), "utf8");
    migrations.push({
      version: name.slice(0, 4),
      name,
      sql,
      checksum: checksum(sql)
    });
  }
  return migrations;
}

export async function runMigrations(client, { migrationsDir = DEFAULT_MIGRATIONS_DIR } = {}) {
  if (!client || typeof client.query !== "function") {
    throw new TypeError("A connected PostgreSQL client is required.");
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
  const appliedNow = [];
  try {
    const files = await loadMigrationFiles(migrationsDir);
    const appliedResult = await client.query(
      "SELECT version, checksum FROM schema_migrations ORDER BY version ASC"
    );
    const applied = new Map(
      (appliedResult.rows || []).map((row) => [String(row.version), String(row.checksum)])
    );

    for (const migration of files) {
      if (applied.has(migration.version)) {
        if (applied.get(migration.version) !== migration.checksum) {
          throw new Error(
            `Applied migration ${migration.version} checksum differs from ${migration.name}.`
          );
        }
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          `INSERT INTO schema_migrations(version, name, checksum)
           VALUES($1, $2, $3)`,
          [migration.version, migration.name, migration.checksum]
        );
        await client.query("COMMIT");
        appliedNow.push(migration.version);
      } catch (error) {
        try { await client.query("ROLLBACK"); } catch (_) {}
        throw error;
      }
    }

    const latest = files.length ? files[files.length - 1].version : null;
    return { latest, applied: appliedNow };
  } finally {
    try { await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]); } catch (_) {}
  }
}

export async function readCurrentSchemaVersion(client) {
  try {
    const result = await client.query(
      "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1"
    );
    return result.rows && result.rows[0] ? String(result.rows[0].version) : null;
  } catch (_) {
    return null;
  }
}

export const MigrationTestHelpers = Object.freeze({ checksum });

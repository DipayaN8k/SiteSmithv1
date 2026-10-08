import { migrations } from './migrations.js';

export async function openDatabase(dbConfig) {
  if (dbConfig.client === 'mysql') return (await import('./mysql.js')).openMysql(dbConfig);
  if (dbConfig.client === 'sqlite') return (await import('./sqlite.js')).openSqlite(dbConfig.file);
  throw new Error(`Unknown database client: ${dbConfig.client}`);
}

/** The table that records which migrations have been applied. Shared by `migrate` and `npm run schema`. */
export function schemaMigrationsDdl(dialect) {
  const ts = dialect === 'mysql' ? 'DATETIME(3)' : 'TEXT';
  return (
    `CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(100) NOT NULL PRIMARY KEY, applied_at ${ts} NOT NULL)` +
    (dialect === 'mysql' ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' : '')
  );
}

/** Apply pending migrations in order. Safe to run on every start: it does nothing when up to date. */
export async function migrate(db, log = () => {}) {
  await db.run(schemaMigrationsDdl(db.dialect));
  const done = new Set((await db.query('SELECT name FROM schema_migrations')).map((r) => r.name));
  const applied = [];
  for (const migration of migrations) {
    if (done.has(migration.name)) continue;
    for (const statement of migration.statements(db.dialect)) await db.run(statement);
    await db.run('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)', [
      migration.name,
      new Date().toISOString().replace('T', ' ').replace('Z', ''),
    ]);
    applied.push(migration.name);
    log(`applied migration ${migration.name}`);
  }
  return applied;
}

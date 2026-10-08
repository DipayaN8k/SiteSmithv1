// Print the whole database schema as SQL: `npm run schema`.
//
// The API creates its own tables on every start, so you normally never need this. Use it when the database user
// is NOT allowed to create tables (the API then fails at start-up with a permission error): run this, paste the
// output into phpMyAdmin (SQL tab) on an EMPTY database, and start the API with AUTO_MIGRATE=false.
//
//   node scripts/print-schema.js            MySQL / MariaDB (default)
//   node scripts/print-schema.js --sqlite   SQLite (development only)
//
// The output also records the migrations as applied, so the tables match exactly what the API would have created.
// Run it once on an empty database: running it twice fails with "table already exists", which is harmless.
import { schemaMigrationsDdl } from '../src/db/index.js';
import { migrations } from '../src/db/migrations.js';

const dialect = process.argv.includes('--sqlite') ? 'sqlite' : 'mysql';
const now = dialect === 'mysql' ? 'UTC_TIMESTAMP(3)' : "strftime('%Y-%m-%d %H:%M:%f', 'now')";

console.log(`-- Sparrowgen database schema (${dialect === 'mysql' ? 'MySQL / MariaDB' : 'SQLite'}). Run once on an empty database.`);
console.log(`${schemaMigrationsDdl(dialect)};`);
for (const migration of migrations) {
  console.log(`\n-- migration ${migration.name}`);
  for (const statement of migration.statements(dialect)) console.log(`${statement.trim()};`);
  console.log(`INSERT INTO schema_migrations (name, applied_at) VALUES ('${migration.name}', ${now});`);
}

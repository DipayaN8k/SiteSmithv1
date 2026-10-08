// Apply pending database migrations: `npm run migrate`.
// The server does this by itself on every start (AUTO_MIGRATE=true), so you only need this to
// prepare a database without starting the app.
import { loadConfig, loadDotEnv } from '../src/config.js';
import { migrate, openDatabase } from '../src/db/index.js';

loadDotEnv();
const db = await openDatabase(loadConfig().db);
try {
  const applied = await migrate(db, (line) => console.log(line));
  console.log(applied.length ? `Done: ${applied.length} migration(s) applied.` : 'Schema is already up to date.');
} finally {
  await db.close();
}

// Entry file for Hostinger (set "Entry file" to server.js) and for local use: `npm start`.
import { loadConfig, loadDotEnv } from './src/config.js';
import { migrate, openDatabase } from './src/db/index.js';
import { createApp } from './src/http/app.js';
import { registerRoutes } from './src/routes/index.js';

loadDotEnv();
const config = loadConfig();
const db = await openDatabase(config.db);

if (config.autoMigrate) {
  const applied = await migrate(db, (line) => console.log(`${new Date().toISOString()} INFO db ${line}`));
  if (applied.length === 0) console.log(`${new Date().toISOString()} INFO db schema is up to date`);
}

const { server } = createApp({ config, db, registerRoutes });
server.listen(config.port, () => {
  console.log(`${new Date().toISOString()} INFO api listening on port ${config.port} (${config.env}, ${config.db.client})`);
});

function shutdown(signal) {
  console.log(`${new Date().toISOString()} INFO api received ${signal}, shutting down`);
  server.close(async () => {
    await db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

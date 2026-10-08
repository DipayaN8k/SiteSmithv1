// SQLite driver using Node's built-in `node:sqlite` (Node 22.5+). For local development and the test
// suite only: production uses MySQL (see mysql.js). Same interface as the MySQL driver.
export async function openSqlite(file) {
  const { DatabaseSync } = await import('node:sqlite');
  const raw = new DatabaseSync(file);
  raw.exec('PRAGMA foreign_keys = ON');

  const conn = {
    dialect: 'sqlite',
    async query(sql, params = []) {
      return raw.prepare(sql).all(...params).map((row) => ({ ...row }));
    },
    async run(sql, params = []) {
      const result = raw.prepare(sql).run(...params);
      return { insertId: Number(result.lastInsertRowid), affectedRows: Number(result.changes) };
    },
  };

  // One connection, so transactions are queued one after another.
  let queue = Promise.resolve();
  return {
    ...conn,
    transaction(fn) {
      const job = async () => {
        raw.exec('BEGIN');
        try {
          const result = await fn(conn);
          raw.exec('COMMIT');
          return result;
        } catch (err) {
          raw.exec('ROLLBACK');
          throw err;
        }
      };
      const result = queue.then(job, job);
      queue = result.catch(() => {});
      return result;
    },
    async close() {
      raw.close();
    },
  };
}

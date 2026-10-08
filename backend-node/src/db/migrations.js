// Schema, written once per dialect through a few tokens. Add new migrations to the END of the list and
// never edit one that has been released: the runner skips migrations it has already recorded.
const types = (dialect) =>
  dialect === 'mysql'
    ? {
        pk: 'INT NOT NULL AUTO_INCREMENT PRIMARY KEY',
        ts: 'DATETIME(3)',
        bool: 'TINYINT(1)',
        tail: ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
      }
    : { pk: 'INTEGER PRIMARY KEY AUTOINCREMENT', ts: 'TEXT', bool: 'INTEGER', tail: '' };

export const migrations = [
  {
    name: '0001_initial',
    statements(dialect) {
      const t = types(dialect);
      return [
        `CREATE TABLE users (
          id ${t.pk},
          name VARCHAR(200) NOT NULL,
          email VARCHAR(254) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          is_active ${t.bool} NOT NULL DEFAULT 1,
          created_at ${t.ts} NOT NULL
        )${t.tail}`,
        `CREATE TABLE leads (
          id ${t.pk},
          full_name VARCHAR(200) NOT NULL,
          email VARCHAR(254) NOT NULL,
          phone VARCHAR(30) NULL,
          business_type VARCHAR(50) NOT NULL,
          business_type_other VARCHAR(200) NULL,
          project_type VARCHAR(100) NULL,
          budget VARCHAR(100) NULL,
          message TEXT NULL,
          assigned_to INT NULL,
          consent ${t.bool} NOT NULL,
          created_at ${t.ts} NOT NULL,
          updated_at ${t.ts} NOT NULL,
          FOREIGN KEY (assigned_to) REFERENCES users(id)
        )${t.tail}`,
        'CREATE INDEX ix_leads_email ON leads (email)',
        'CREATE INDEX ix_leads_created_at ON leads (created_at)',
        `CREATE TABLE lead_stages (
          id ${t.pk},
          lead_id INT NOT NULL,
          stage VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          assigned_to INT NULL,
          updated_at ${t.ts} NOT NULL,
          UNIQUE (lead_id, stage),
          FOREIGN KEY (lead_id) REFERENCES leads(id),
          FOREIGN KEY (assigned_to) REFERENCES users(id)
        )${t.tail}`,
        `CREATE TABLE comments (
          id ${t.pk},
          lead_id INT NOT NULL,
          stage VARCHAR(20) NULL,
          user_id INT NOT NULL,
          body TEXT NOT NULL,
          created_at ${t.ts} NOT NULL,
          FOREIGN KEY (lead_id) REFERENCES leads(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )${t.tail}`,
        'CREATE INDEX ix_comments_lead_id ON comments (lead_id)',
        `CREATE TABLE activity_log (
          id ${t.pk},
          lead_id INT NOT NULL,
          user_id INT NULL,
          action VARCHAR(50) NOT NULL,
          stage VARCHAR(20) NULL,
          old_value VARCHAR(255) NULL,
          new_value VARCHAR(255) NULL,
          message VARCHAR(500) NOT NULL,
          created_at ${t.ts} NOT NULL,
          FOREIGN KEY (lead_id) REFERENCES leads(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )${t.tail}`,
        'CREATE INDEX ix_activity_log_lead_id ON activity_log (lead_id)',
        'CREATE INDEX ix_activity_log_created_at ON activity_log (created_at)',
        `CREATE TABLE requirements (
          id ${t.pk},
          lead_id INT NOT NULL,
          stage VARCHAR(20) NOT NULL,
          text TEXT NOT NULL,
          done ${t.bool} NOT NULL DEFAULT 0,
          created_by INT NOT NULL,
          done_by INT NULL,
          done_at ${t.ts} NULL,
          created_at ${t.ts} NOT NULL,
          FOREIGN KEY (lead_id) REFERENCES leads(id),
          FOREIGN KEY (created_by) REFERENCES users(id),
          FOREIGN KEY (done_by) REFERENCES users(id)
        )${t.tail}`,
        'CREATE INDEX ix_requirements_lead_id ON requirements (lead_id)',
      ];
    },
  },
];

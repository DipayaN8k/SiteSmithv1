// Audit lines for team-account changes. They go to stdout (Hostinger shows it in the app's runtime logs).
let sink = (line) => console.log(line);

export function setAuditSink(fn) {
  sink = fn;
}

export function audit(message) {
  sink(`${new Date().toISOString()} INFO app.audit ${message}`);
}

// Fallback entry file for hosts that load the entry file with require(). It simply starts server.js.
// Use server.js as the entry file whenever the host allows it.
import('./server.js').catch((err) => {
  console.error(err);
  process.exit(1);
});

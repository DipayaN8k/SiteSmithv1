// Bundle each app into an archive you can upload to Hostinger (hPanel > Websites > Add website >
// Node.js Apps > Upload your website files). Hostinger expects an app's package.json at the ROOT of what it
// deploys, so each app gets its own archive instead of one archive of the whole repository.
//
//   node tools/package.mjs            -> dist/frontend.tar.gz, dist/admin.tar.gz, dist/backend-node.tar.gz
//   node tools/package.mjs backend-node  -> only the Node backend
//
// Needs `tar`, which ships with Windows 10+, macOS and Linux. node_modules, build output and secrets are
// left out; Hostinger installs and builds on its side.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const all = ['frontend', 'admin', 'backend-node'];
const wanted = process.argv.slice(2);
const apps = wanted.length ? wanted : all;

const EXCLUDE = [
  'node_modules', '.next', 'out', '.git', '.env', '.env.local', '.env.production', '.env.development',
  '*.db', '*.db-journal', '*.log', '*.tsbuildinfo', 'dev-admin-login.txt', '.DS_Store',
];

for (const app of apps) {
  if (!all.includes(app)) {
    console.error(`Unknown app "${app}". Choose from: ${all.join(', ')}`);
    process.exit(1);
  }
  const dir = path.join(root, app);
  if (!fs.existsSync(path.join(dir, 'package.json'))) {
    console.error(`${app}/package.json not found`);
    process.exit(1);
  }
}

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
for (const app of apps) {
  const archive = path.join('..', 'dist', `${app}.tar.gz`); // relative on purpose: GNU tar reads "D:" as a host name
  execFileSync('tar', ['-czf', archive, ...EXCLUDE.map((p) => `--exclude=${p}`), '.'], { cwd: path.join(root, app) });
  const kb = Math.round(fs.statSync(path.join(root, 'dist', `${app}.tar.gz`)).size / 1024);
  console.log(`dist/${app}.tar.gz  (${kb} KB)`);
}

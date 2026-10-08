// Team account management. This is the ONLY way accounts are created, reset or deactivated
// (there is no sign-up page, on purpose).
//
//   node scripts/manage-users.js create --name "Full Name" --email person@company.com
//   node scripts/manage-users.js list
//   node scripts/manage-users.js reset-password --email person@company.com
//   node scripts/manage-users.js deactivate --email person@company.com
//   node scripts/manage-users.js activate   --email person@company.com
//
// The password is asked for at a hidden prompt (12+ characters), or read from standard input with
// --password-stdin. It is never a command-line argument, so it stays out of shell history.
//
// No database access from where you are typing? Add --print-sql. Nothing connects to a database:
// the script prints the SQL for you to paste into phpMyAdmin (hPanel > Databases > phpMyAdmin).
//
//   node scripts/manage-users.js create --name "Full Name" --email person@company.com --print-sql
import { loadConfig, loadDotEnv } from '../src/config.js';
import { ServiceError } from '../src/core/errors.js';
import { hashPassword, validatePasswordStrength } from '../src/core/security.js';
import { nowTs } from '../src/core/time.js';
import { migrate, openDatabase } from '../src/db/index.js';
import * as users from '../src/services/users.js';

const USAGE = `Usage: node scripts/manage-users.js <command> [options]
Commands:
  create          --name "Full Name" --email you@company.com   create a team member
  list                                                         list team members
  reset-password  --email you@company.com                      set a new password
  deactivate      --email you@company.com                      block someone from logging in
  activate        --email you@company.com                      let them log in again
Options:
  --password-stdin   read the password from standard input instead of prompting
  --print-sql        print SQL for phpMyAdmin instead of touching the database`;

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    const key = arg.slice(2);
    if (['password-stdin', 'print-sql'].includes(key)) flags[key] = true;
    else flags[key] = rest[(i += 1)];
  }
  return { command, flags };
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    // Windows PowerShell 5.1 starts piped text with an invisible byte-order mark. Left in, it becomes part
    // of the password and the account can never sign in, so drop it.
    process.stdin.on('end', () => resolve(data.replace(/^﻿/, '')));
  });
}

/** Ask for a line of text without echoing it (falls back to a plain read when not a terminal). */
function promptHidden(question) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      readStdin().then((text) => resolve(text.split(/\r?\n/)[0] ?? ''));
      return;
    }
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    let input = '';
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.off('data', onData);
          process.stdout.write('\n');
          return resolve(input);
        }
        if (ch === '\u0003') process.exit(130); // Ctrl+C
        if (ch === '\u007f' || ch === '\b') input = input.slice(0, -1);
        else input += ch;
      }
    };
    process.stdin.on('data', onData);
  });
}

async function getPassword(flags) {
  if (flags['password-stdin']) return (await readStdin()).replace(/\r?\n$/, '');
  const first = await promptHidden('Password: ');
  const second = await promptHidden('Confirm password: ');
  if (first !== second) throw new ServiceError(422, 'Passwords do not match');
  return first;
}

/** A MySQL string literal (quotes and backslashes escaped). */
const sql = (value) => `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;

async function printSql(command, flags) {
  const email = users.normalizeEmail(flags.email ?? '');
  if (command === 'create') {
    const password = await getPassword(flags);
    const clean = users.checkNewUser({ name: flags.name, email, password });
    const hash = await hashPassword(password);
    console.log('-- Paste into phpMyAdmin (SQL tab) on the production database:');
    console.log(
      `INSERT INTO users (name, email, password_hash, is_active, created_at) VALUES (${sql(clean.name)}, ${sql(clean.email)}, ${sql(hash)}, 1, ${sql(nowTs())});`,
    );
  } else if (command === 'reset-password') {
    const password = await getPassword(flags);
    validatePasswordStrength(password);
    console.log('-- Paste into phpMyAdmin (SQL tab) on the production database:');
    console.log(`UPDATE users SET password_hash = ${sql(await hashPassword(password))} WHERE email = ${sql(email)};`);
  } else if (command === 'deactivate' || command === 'activate') {
    console.log('-- Paste into phpMyAdmin (SQL tab) on the production database:');
    console.log(`UPDATE users SET is_active = ${command === 'activate' ? 1 : 0} WHERE email = ${sql(email)};`);
  } else {
    throw new Error('--print-sql works with create, reset-password, activate and deactivate.');
  }
}

async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2));
  if (!command || command === '--help' || command === 'help') {
    console.log(USAGE);
    return 0;
  }
  if (flags['print-sql']) {
    await printSql(command, flags);
    return 0;
  }

  loadDotEnv();
  const db = await openDatabase(loadConfig().db);
  try {
    await migrate(db); // makes the first account possible before the app has ever started
    if (command === 'create') {
      const user = await users.createUser(db, { name: flags.name, email: flags.email, password: await getPassword(flags) });
      console.log(`Created ${user.email} (id ${user.id})`);
    } else if (command === 'reset-password') {
      const user = await users.resetPassword(db, flags.email ?? '', await getPassword(flags));
      console.log(`Password reset for ${user.email}`);
    } else if (command === 'deactivate' || command === 'activate') {
      const user = await users.setActive(db, flags.email ?? '', command === 'activate');
      console.log(`${command === 'activate' ? 'Activated' : 'Deactivated'} ${user.email}`);
    } else if (command === 'list') {
      for (const u of await users.listUsers(db)) {
        console.log(`${u.id}\t${u.email}\t${u.name}\t${users.isActive(u) ? 'active' : 'inactive'}`);
      }
    } else {
      console.error(`Unknown command: ${command}\n${USAGE}`);
      return 1;
    }
    return 0;
  } finally {
    await db.close();
  }
}

// Set the exit code and let Node exit by itself, so piped output is never cut off.
main().then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    console.error(`Error: ${err instanceof ServiceError ? err.detail : err.message}`);
    process.exitCode = 1;
  },
);

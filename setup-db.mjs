#!/usr/bin/env node
// =============================================
// setup-db.mjs — Apply Supabase schema automatically
// Run: node setup-db.mjs
// =============================================
import readline from "readline";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Colors ──────────────────────────────────
const c = { reset:"\x1b[0m", bold:"\x1b[1m", dim:"\x1b[2m", green:"\x1b[32m", yellow:"\x1b[33m", blue:"\x1b[34m", cyan:"\x1b[36m", red:"\x1b[31m", white:"\x1b[37m", bgBlue:"\x1b[44m" };
const bold   = (s) => `${c.bold}${s}${c.reset}`;
const dim    = (s) => `${c.dim}${s}${c.reset}`;
const green  = (s) => `${c.green}${s}${c.reset}`;
const yellow = (s) => `${c.yellow}${s}${c.reset}`;
const cyan   = (s) => `${c.cyan}${s}${c.reset}`;
const red    = (s) => `${c.red}${s}${c.reset}`;

const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

function print(msg = "") { process.stdout.write(msg + "\n"); }
function hr()     { print(dim("─".repeat(52))); }
function ok(msg)  { print(`  ${green("✓")} ${msg}`); }
function warn(msg){ print(`  ${yellow("⚠")} ${msg}`); }
function err(msg) { print(`  ${red("✗")} ${msg}`); }
function info(msg){ print(`  ${c.blue}ℹ${c.reset} ${msg}`); }

// ── Read .env.local ──────────────────────────
function readEnv() {
  const envPath = path.join(__dirname, ".env.local");
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(
    fs.readFileSync(envPath, "utf8")
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
  );
}

// ── Execute SQL via Management API ───────────
async function runSQL(projectRef, token, sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message ?? text; } catch {}
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  return text;
}

// ── Split SQL into individual statements ─────
function splitSQL(sql) {
  // Remove comments, split on semicolons, keep non-empty statements
  return sql
    .replace(/--[^\n]*/g, "")           // remove -- comments
    .replace(/\/\*[\s\S]*?\*\//g, "")   // remove /* */ comments
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ── Main ─────────────────────────────────────
async function main() {
  print("");
  print(`${c.bold}${c.bgBlue}${c.white}  🗄️  Ilona Clinic — Database Setup  ${c.reset}`);
  print(dim("  Applies supabase-schema.sql to your project"));
  print("");

  // Get project ref from env
  const env = readEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL ?? "";
  const projectRef  = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1];

  if (!projectRef) {
    err("VITE_SUPABASE_URL not found in .env.local");
    err("Run node init.mjs first to configure the project.");
    rl.close(); process.exit(1);
  }

  ok(`Project: ${cyan(projectRef)}`);
  print("");

  // Explain how to get the token
  hr();
  print(bold("  You need a Supabase Personal Access Token (PAT)"));
  hr();
  print("");
  info("Go to: https://supabase.com/dashboard/account/tokens");
  info("Click  Generate new token");
  info("Name it anything (e.g. 'cli-setup') and copy it");
  print("");
  warn("The token is only shown once — copy it before continuing");
  print("");

  const token = (await ask(cyan("  ? Paste your Personal Access Token: "))).trim();

  if (!token || token.length < 20) {
    err("Token looks invalid. Please try again.");
    rl.close(); process.exit(1);
  }

  // Verify token by fetching project info
  print("");
  info("Verifying token...");
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Invalid token or project not found");
    const proj = await res.json();
    ok(`Connected to project: ${bold(proj.name ?? projectRef)}`);
  } catch (e) {
    err("Could not connect: " + e.message);
    rl.close(); process.exit(1);
  }

  // Read schema file
  const schemaPath = path.join(__dirname, "supabase-schema.sql");
  if (!fs.existsSync(schemaPath)) {
    err("supabase-schema.sql not found");
    rl.close(); process.exit(1);
  }

  const schemaSQL  = fs.readFileSync(schemaPath, "utf8");
  const statements = splitSQL(schemaSQL);

  print("");
  hr();
  print(bold(`  Applying schema (${statements.length} statements)...`));
  hr();
  print("");

  let passed = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.slice(0, 60).replace(/\s+/g, " ");

    try {
      await runSQL(projectRef, token, stmt);
      passed++;
      ok(`${dim(`[${i+1}/${statements.length}]`)} ${preview}...`);
    } catch (e) {
      const msg = e.message ?? "";

      // Treat "already exists" errors as skipped (idempotent re-runs)
      if (
        msg.includes("already exists") ||
        msg.includes("duplicate") ||
        msg.includes("relation") && msg.includes("exist")
      ) {
        skipped++;
        print(`  ${yellow("~")} ${dim(`[${i+1}/${statements.length}]`)} ${dim(preview)}... ${dim("(already exists, skipped)")}`);
      } else {
        failed++;
        print(`  ${red("✗")} ${dim(`[${i+1}/${statements.length}]`)} ${preview}`);
        print(`    ${red("Error:")} ${msg}`);
      }
    }
  }

  // Summary
  print("");
  hr();
  print(bold("  Summary"));
  hr();
  print("");
  ok(`Applied:  ${passed}`);
  if (skipped > 0) print(`  ${yellow("~")} Skipped:  ${skipped} ${dim("(already existed)")}`);
  if (failed > 0)  print(`  ${red("✗")} Failed:   ${failed}`);
  print("");

  if (failed === 0) {
    print(green(bold("  ✅ Database is ready! Run: npm run dev")));
  } else {
    warn("Some statements failed. Check the errors above.");
    warn("You can also run supabase-schema.sql manually in the SQL Editor.");
  }

  print("");
  rl.close();
}

main().catch((e) => {
  err("Unexpected error: " + e.message);
  rl.close();
  process.exit(1);
});

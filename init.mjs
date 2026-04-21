#!/usr/bin/env node
// =============================================
// init.mjs — Ilona Clinic Setup Wizard
// Run: node init.mjs
// =============================================
import readline from "readline";
import fs from "fs";
import { execSync, spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Colors ──────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  bgBlue: "\x1b[44m",
};

const bold = (s) => `${c.bold}${s}${c.reset}`;
const dim = (s) => `${c.dim}${s}${c.reset}`;
const green = (s) => `${c.green}${s}${c.reset}`;
const yellow = (s) => `${c.yellow}${s}${c.reset}`;
const blue = (s) => `${c.blue}${s}${c.reset}`;
const cyan = (s) => `${c.cyan}${s}${c.reset}`;
const red = (s) => `${c.red}${s}${c.reset}`;

// ── Helpers ──────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

function print(msg = "") { process.stdout.write(msg + "\n"); }
function hr(ch = "─", len = 52) { print(dim(ch.repeat(len))); }
function step(n, total, label) {
  print("");
  hr();
  print(`${bold(cyan(`[${n}/${total}]`))} ${bold(label)}`);
  hr();
}
function ok(msg)     { print(`  ${green("✓")} ${msg}`); }
function warn(msg)   { print(`  ${yellow("⚠")} ${msg}`); }
function info(msg)   { print(`  ${blue("ℹ")} ${msg}`); }
function err(msg)    { print(`  ${red("✗")} ${msg}`); }
function action(msg) { print(`  ${cyan("→")} ${msg}`); }

function readEnv() {
  const envPath = path.join(__dirname, ".env.local");
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(
    fs.readFileSync(envPath, "utf8")
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => l.split("=").map((p) => p.trim()))
  );
}

function writeEnv(vars) {
  const envPath = path.join(__dirname, ".env.local");
  const lines = Object.entries(vars).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(envPath, lines.join("\n") + "\n");
}

function isPlaceholder(val) {
  return !val || val.includes("your_") || val === "";
}

// ── Main ──────────────────────────────────────
async function main() {
  print("");
  print(`${c.bold}${c.bgBlue}${c.white}  🏥  Ilona Clinic — Initial Setup Wizard  ${c.reset}`);
  print(dim("  Speech Therapy Clinic Management System"));
  print("");

  const TOTAL = 5;

  // ── Step 1: Node modules ──────────────────
  step(1, TOTAL, "Check dependencies (node_modules)");

  const hasModules = fs.existsSync(path.join(__dirname, "node_modules"));
  if (hasModules) {
    ok("node_modules found");
  } else {
    warn("node_modules missing — running npm install...");
    try {
      execSync("npm install", { stdio: "inherit", cwd: __dirname });
      ok("Installation complete");
    } catch {
      err("Installation failed. Run npm install manually.");
      process.exit(1);
    }
  }

  // ── Step 2: Supabase project ──────────────
  step(2, TOTAL, "Create a Supabase project");

  print("");
  print(bold("  Do the following in your browser:"));
  print("");
  action("Go to https://supabase.com → New Project");
  action("Choose a project name (e.g. ilona-clinic)");
  action("Choose region: EU West (or closest to you)");
  action("Set a strong DB password and save it somewhere safe");
  print("");
  warn("Wait until the project is ready (~1 min) before continuing");
  print("");

  const ready1 = (await ask(cyan("  ? Supabase project is ready? (Enter to continue): "))).trim();
  if (ready1.toLowerCase() === "q") { rl.close(); return; }

  // ── Step 3: Run SQL schema ────────────────
  step(3, TOTAL, "Apply the database schema");

  const schemaPath = path.join(__dirname, "supabase-schema.sql");
  const schemaContent = fs.readFileSync(schemaPath, "utf8");

  print("");
  print(bold("  In the Supabase Dashboard:"));
  print("");
  action("Go to: SQL Editor → New Query");
  action("Copy and paste the entire contents of: " + bold("supabase-schema.sql"));
  action('Click "Run"');
  print("");
  info(`File location: ${cyan(schemaPath)}`);
  print("");

  print(dim("  --- Preview (first 10 lines) ---"));
  schemaContent.split("\n").slice(0, 10).forEach((l) => print(dim("  " + l)));
  print(dim("  ... (open the file to see the rest)"));
  print("");

  const ready2 = (await ask(cyan("  ? SQL ran successfully? (Enter to continue): "))).trim();

  // ── Step 3b: Storage buckets ──────────────
  print("");
  print(bold("  Now create the Storage Buckets:"));
  print("");
  action("Go to: Storage → New Bucket");
  action(`Create bucket: ${bold("patient-files")}   → ${yellow("Private")} (do NOT check Public)`);
  action(`Create bucket: ${bold("treatment-files")}  → ${yellow("Private")}`);
  print("");

  const ready3 = (await ask(cyan("  ? Both buckets created? (Enter to continue): "))).trim();

  // ── Step 3c: Auth user ────────────────────
  print("");
  print(bold("  Create a login user:"));
  print("");
  action("Go to: Authentication → Users → Add User");
  action("Enter your email address and a password");
  action("Click Create User");
  print("");

  const ready4 = (await ask(cyan("  ? User created? (Enter to continue): "))).trim();

  // ── Step 4: .env.local ────────────────────
  step(4, TOTAL, "Configure environment variables (.env.local)");

  print("");
  print(bold("  Find your API keys:"));
  action("Go to: Project → Settings → API");
  action(`Copy: ${bold("Project URL")}`);
  action(`Copy: ${bold("anon public")} key`);
  print("");

  const current = readEnv();

  let supabaseUrl = current.VITE_SUPABASE_URL;
  if (isPlaceholder(supabaseUrl)) {
    supabaseUrl = (await ask(cyan("  ? Paste your Project URL: "))).trim();
  } else {
    ok(`VITE_SUPABASE_URL already set: ${dim(supabaseUrl.slice(0, 30) + "...")}`);
    const change = (await ask(cyan("  ? Change it? (Enter to skip, y to change): "))).trim();
    if (change.toLowerCase() === "y") {
      supabaseUrl = (await ask(cyan("  ? New Project URL: "))).trim();
    }
  }

  let anonKey = current.VITE_SUPABASE_ANON_KEY;
  if (isPlaceholder(anonKey)) {
    anonKey = (await ask(cyan("  ? Paste your anon public key: "))).trim();
  } else {
    ok(`VITE_SUPABASE_ANON_KEY already set: ${dim(anonKey.slice(0, 30) + "...")}`);
    const change = (await ask(cyan("  ? Change it? (Enter to skip, y to change): "))).trim();
    if (change.toLowerCase() === "y") {
      anonKey = (await ask(cyan("  ? New anon key: "))).trim();
    }
  }

  // Validate basic format
  const urlOk = supabaseUrl.startsWith("https://") && supabaseUrl.includes("supabase.co");
  const keyOk = anonKey.startsWith("eyJ") && anonKey.length > 100;

  if (!urlOk) warn("URL doesn't look right. Expected format: https://xxxx.supabase.co");
  if (!keyOk) warn("Key doesn't look right. Make sure you copied the full anon key.");

  writeEnv({
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: anonKey,
  });

  ok(".env.local updated successfully");

  // ── Step 5: Launch dev server ─────────────
  step(5, TOTAL, "Launch the dev server");

  print("");
  ok("Everything is ready!");
  print("");

  const launch = (await ask(cyan("  ? Start the app now? (Enter = yes, n = no): "))).trim();

  rl.close();

  print("");

  if (launch.toLowerCase() !== "n") {
    print(green(bold("  Starting npm run dev...")));
    print(dim("  Open http://localhost:5173 in your browser"));
    print("");

    const dev = spawn("npm", ["run", "dev"], {
      stdio: "inherit",
      cwd: __dirname,
      shell: true,
    });

    dev.on("error", (e) => {
      err("Failed to start dev server: " + e.message);
    });

    process.on("SIGINT", () => {
      dev.kill();
      print("\n" + dim("  Dev server stopped"));
      process.exit(0);
    });
  } else {
    print(bold("  To start later:"));
    print(cyan("  npm run dev"));
    print("");
    print(bold("  What was built:"));
    print("");
    print(`  ${green("✓")} Patient list with search`);
    print(`  ${green("✓")} Patient card with 3 tabs`);
    print(`  ${green("✓")} Diagnoses + file uploads`);
    print(`  ${green("✓")} Treatment file (session notes + attachments)`);
    print(`  ${green("✓")} Weekly/monthly calendar`);
    print(`  ${green("✓")} Israeli ID validation`);
    print(`  ${green("✓")} Auto-calculated age`);
    print(`  ${green("✓")} Hebrew RTL interface`);
    print("");
  }
}

main().catch((e) => {
  err("Error: " + e.message);
  rl.close();
  process.exit(1);
});

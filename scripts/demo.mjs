// One-command demo: an embedded Postgres (PGlite), sample shops and audits,
// and a simulated AI. No Docker, database or API key needed.
//
//   npm run demo                  then open http://localhost:3000
//   npm run demo -- --reset       start again from fresh sample data
//   npm run demo -- --port=4000   use another port
//   npm run demo -- --open        also open the browser
//
// Demo data is kept in .demo/ between runs. Never use this for real audits.
import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const dataDir = path.join(root, ".demo");
const say = (msg = "") => console.log(msg);

function fail(msg) {
  console.error(`\n  ${msg}\n`);
  process.exit(1);
}

/** Runs a command and resolves when it exits cleanly (async, so the in-process database keeps serving). */
function run(cmd, cmdArgs, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, { cwd: root, env: { ...process.env, ...extraEnv }, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${path.basename(cmdArgs[0] ?? cmd)} exited with code ${code}`))));
  });
}

async function freePort(start, host) {
  for (let port = start; port < start + 50; port++) {
    const free = await new Promise((resolve) => {
      const probe = net.createServer();
      probe.once("error", () => resolve(false));
      probe.once("listening", () => probe.close(() => resolve(true)));
      probe.listen(port, host);
    });
    if (free) return port;
  }
  fail(`No free port found between ${start} and ${start + 49}.`);
}

function newest(dir) {
  let t = 0;
  if (!existsSync(dir)) return t;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    t = Math.max(t, e.isDirectory() ? newest(p) : statSync(p).mtimeMs);
  }
  return t;
}

function findServer(dir, depth = 0) {
  const direct = path.join(dir, "server.js");
  if (existsSync(direct)) return direct;
  if (depth > 5 || !existsSync(dir)) return null;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name === "node_modules" || e.name === ".next") continue;
    const found = findServer(path.join(dir, e.name), depth + 1);
    if (found) return found;
  }
  return null;
}

function lanAddress() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list ?? []) if (a.family === "IPv4" && !a.internal) return a.address;
  }
  return null;
}

async function waitUntilUp(url, child) {
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) fail("The app stopped while starting. See the messages above.");
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  fail("The app did not start within a minute. See the messages above.");
}

// ── 1. Checks ────────────────────────────────────────────────────────────
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 11)) fail(`Node.js 20.11 or newer is needed (this is ${process.versions.node}).`);
if (!existsSync(path.join(root, "node_modules", "next"))) fail("Run `npm install` first, then `npm run demo` again.");

let PGlite, PGLiteSocketServer;
try {
  ({ PGlite } = await import("@electric-sql/pglite"));
  ({ PGLiteSocketServer } = await import("@electric-sql/pglite-socket"));
} catch {
  fail("The demo database package is missing. Run `npm install`, then `npm run demo` again.");
}

if (flag("reset")) {
  rmSync(dataDir, { recursive: true, force: true });
  say("  Starting from fresh sample data.");
}
mkdirSync(dataDir, { recursive: true });

// ── 2. Database ──────────────────────────────────────────────────────────
say("\n  Starting the demo database…");
const db = new PGlite(path.join(dataDir, "pgdata"));
await db.waitReady;
const dbPort = await freePort(54329, "127.0.0.1");
const dbServer = new PGLiteSocketServer({ db, port: dbPort, host: "127.0.0.1", maxConnections: 10 });
await dbServer.start();
const DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${dbPort}/postgres?sslmode=disable&connection_limit=1&pgbouncer=true`;

let app = null;
let stopping = false;
async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  if (app && app.exitCode === null) app.kill();
  await dbServer.stop().catch(() => {});
  await db.close().catch(() => {});
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

try {
  say("  Preparing the database tables…");
  await run(process.execPath, [path.join(root, "node_modules", "prisma", "build", "index.js"), "migrate", "deploy"], { DATABASE_URL });

  // ── 3. Build (only when the code changed since the last build) ─────────
  const buildId = path.join(root, ".next", "BUILD_ID");
  const sources = Math.max(
    newest(path.join(root, "src")),
    newest(path.join(root, "public")),
    ...["package.json", "next.config.ts", path.join("prisma", "schema.prisma")].map((f) => statSync(path.join(root, f)).mtimeMs),
  );
  let serverJs = findServer(path.join(root, ".next", "standalone"));
  if (flag("rebuild") || !serverJs || !existsSync(buildId) || sources > statSync(buildId).mtimeMs) {
    say("\n  Building the app. The first time takes a minute or two…\n");
    await run(process.execPath, [path.join(root, "node_modules", "next", "dist", "bin", "next"), "build"], { NEXT_TELEMETRY_DISABLED: "1" });
    serverJs = findServer(path.join(root, ".next", "standalone"));
    if (!serverJs) throw new Error("The build finished but its server file is missing.");
  }
  // The standalone server serves these from its own folder.
  const appDir = path.dirname(serverJs);
  cpSync(path.join(root, "public"), path.join(appDir, "public"), { recursive: true, force: true });
  cpSync(path.join(root, ".next", "static"), path.join(appDir, ".next", "static"), { recursive: true, force: true });

  // ── 4. App ─────────────────────────────────────────────────────────────
  const port = await freePort(Number(option("port") || process.env.DEMO_PORT || 3000), "0.0.0.0");
  say("\n  Starting the app…");
  app = spawn(process.execPath, [serverJs], {
    cwd: appDir,
    stdio: ["ignore", "inherit", "inherit"],
    env: {
      ...process.env,
      NODE_ENV: "production",
      DEMO_MODE: "true",
      DATABASE_URL,
      PORT: String(port),
      HOSTNAME: "0.0.0.0",
      UPLOAD_DIR: path.join(dataDir, "uploads"),
      TZ: process.env.TZ || "Asia/Bahrain",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });
  app.on("exit", (code) => {
    if (!stopping) {
      console.error(`\n  The app stopped (code ${code}).`);
      shutdown(code || 1);
    }
  });
  await waitUntilUp(`http://127.0.0.1:${port}/api/health`, app);

  const local = `http://localhost:${port}`;
  const lan = lanAddress();
  say(`
  ==============================================================
    Visibility Evaluator demo is running

    On this computer:  ${local}
    ${lan ? `On a phone:        http://${lan}:${port}  (same Wi-Fi, if the firewall allows)` : ""}

    Sign in with one click on the login page, or use:
      Admin       admin@demo.local / demo1234
      Field rep   rep@demo.local   / demo1234

    AI results are simulated and all data is sample data.
    Stop with Ctrl+C. Start fresh with: npm run demo -- --reset
  ==============================================================
`);
  if (flag("open")) {
    const opener = process.platform === "win32" ? ["cmd", ["/c", "start", "", local]] : process.platform === "darwin" ? ["open", [local]] : ["xdg-open", [local]];
    spawn(opener[0], opener[1], { stdio: "ignore", detached: true }).unref();
  }
} catch (err) {
  console.error(`\n  The demo could not start: ${err.message}\n`);
  await shutdown(1);
}

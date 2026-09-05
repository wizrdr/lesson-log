import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, statSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const SPIKE_DIR = dirname(fileURLToPath(import.meta.url));
export const OUT_DIR = join(SPIKE_DIR, "out");

export function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (const a of argv) {
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      flags[k] = v === undefined ? true : v;
    } else positional.push(a);
  }
  return { flags, positional };
}

export function die(msg) {
  console.error(`Ошибка: ${msg}`);
  process.exit(1);
}

export function requireEnv(name, dryRun) {
  const v = process.env[name];
  if (!v && !dryRun) die(`нет ${name}. Скопируй .env.example в .env и запусти через node --env-file=.env`);
  return v ?? `<${name}>`;
}

export function ensureOut() {
  mkdirSync(OUT_DIR, { recursive: true });
}

export function stripExt(file) {
  const b = basename(file);
  return b.slice(0, b.length - extname(b).length);
}

export function outPath(base, suffix) {
  return join(OUT_DIR, `${base}.${suffix}`);
}

export function readJsonIfExists(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
}

export function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

export function fileSize(file) {
  return statSync(file).size;
}

export function fmtBytes(n) {
  return `${(n / 1024 / 1024).toFixed(1)} МБ`;
}

export function fmtTime(sec) {
  if (sec == null || Number.isNaN(sec)) return "??:??";
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(r).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function fmtUsd(n) {
  return n == null ? "—" : `$${n.toFixed(4)}`;
}

export function fmtMs(ms) {
  return `${(ms / 1000).toFixed(1)} с`;
}

export function hasBin(bin) {
  return spawnSync(bin, ["-version"], { stdio: "ignore" }).status === 0;
}

export function probeDuration(file) {
  if (!hasBin("ffprobe")) return null;
  try {
    const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
    const d = parseFloat(out.trim());
    return Number.isFinite(d) ? d : null;
  } catch {
    return null;
  }
}

export async function timed(fn) {
  const t0 = performance.now();
  const result = await fn();
  return { result, elapsedMs: performance.now() - t0 };
}

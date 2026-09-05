import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { PRICES_CHECKED_2026_09_05 as PRICES, audioCost } from "./prices.mjs";
import {
  die, ensureOut, fileSize, fmtBytes, fmtMs, fmtTime, fmtUsd, hasBin,
  outPath, parseArgs, probeDuration, readJsonIfExists, requireEnv, stripExt, timed, writeJson,
} from "./common.mjs";

const DEEPGRAM_URL = "https://api.deepgram.com/v1/listen?model=nova-3&language=multi&smart_format=true&punctuate=true&diarize=true&utterances=true";
const WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions";
const WHISPER_LIMIT = 25 * 1024 * 1024;
const CHUNK_SECONDS = 600;

const MIME = { ".m4a": "audio/mp4", ".mp4": "audio/mp4", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".webm": "audio/webm", ".flac": "audio/flac" };

const { flags, positional } = parseArgs(process.argv.slice(2));
const file = positional[0];
if (!file) die("использование: node --env-file=.env transcribe.mjs <audio-file> [--only=deepgram|whisper] [--dry-run]");
const dryRun = Boolean(flags["dry-run"]);
const only = flags.only;
if (only && only !== "deepgram" && only !== "whisper") die("--only принимает deepgram или whisper");

ensureOut();
const base = stripExt(file);
const size = fileSize(file);
const duration = probeDuration(file);
const metaPath = outPath(base, "transcribe.json");
const meta = readJsonIfExists(metaPath) ?? {};
meta.audio = { file, size, duration };

console.log(`Файл: ${file}`);
console.log(`Размер: ${fmtBytes(size)}, длительность: ${fmtTime(duration)}${duration == null ? " (ffprobe не найден)" : ""}`);
if (dryRun) console.log("Режим --dry-run: запросы не отправляются\n");

if (!only || only === "deepgram") await runDeepgram();
if (!only || only === "whisper") await runWhisper();
if (!dryRun) writeJson(metaPath, meta);

async function runDeepgram() {
  const key = requireEnv("DEEPGRAM_API_KEY", dryRun);
  const contentType = MIME[extname(file).toLowerCase()] ?? "application/octet-stream";
  const estCost = duration == null ? null : audioCost(PRICES.deepgram["nova-3-multi"].perMinute, duration);
  console.log("== Deepgram Nova-3 (multi) ==");
  console.log(`POST ${DEEPGRAM_URL}`);
  console.log(`Authorization: Token ${key.slice(0, 4)}…, Content-Type: ${contentType}, тело: ${fmtBytes(size)} одним запросом`);
  console.log(`Оценка стоимости: ${fmtUsd(estCost)} (${PRICES.deepgram["nova-3-multi"].perMinute}$/мин)`);
  if (dryRun) { console.log(); return; }

  const { result: raw, elapsedMs } = await timed(async () => {
    const res = await fetch(DEEPGRAM_URL, {
      method: "POST",
      headers: { Authorization: `Token ${key}`, "Content-Type": contentType },
      body: readFileSync(file),
    });
    if (!res.ok) die(`Deepgram ${res.status}: ${await res.text()}`);
    return res.json();
  });

  writeJson(outPath(base, "deepgram.json"), raw);
  writeFileSync(outPath(base, "deepgram.txt"), deepgramText(raw));
  const realDuration = raw.metadata?.duration ?? duration;
  const cost = realDuration == null ? null : audioCost(PRICES.deepgram["nova-3-multi"].perMinute, realDuration);
  meta.deepgram = { elapsedMs, cost, duration: realDuration, model: "nova-3", language: "multi" };
  console.log(`Готово за ${fmtMs(elapsedMs)}, стоимость ${fmtUsd(cost)} → out/${base}.deepgram.{json,txt}\n`);
}

function deepgramText(raw) {
  const utterances = raw.results?.utterances;
  if (utterances?.length) {
    return utterances.map((u) => `[${fmtTime(u.start)}] Speaker ${u.speaker}: ${u.transcript}`).join("\n") + "\n";
  }
  const alt = raw.results?.channels?.[0]?.alternatives?.[0];
  return (alt?.paragraphs?.transcript ?? alt?.transcript ?? "") + "\n";
}

async function runWhisper() {
  const key = requireEnv("OPENAI_API_KEY", dryRun);
  const needsSplit = size > WHISPER_LIMIT;
  const estChunks = needsSplit ? (duration == null ? "?" : Math.ceil(duration / CHUNK_SECONDS)) : 1;
  const estCost = duration == null ? null : audioCost(PRICES.openai["whisper-1"].perMinute, duration);
  console.log("== OpenAI Whisper (whisper-1) ==");
  console.log(`POST ${WHISPER_URL} multipart: model=whisper-1, response_format=verbose_json, file=<кусок>`);
  console.log(`Authorization: Bearer ${key.slice(0, 4)}…`);
  console.log(needsSplit
    ? `Файл больше 25 МБ → нарезка ffmpeg на куски по ${CHUNK_SECONDS / 60} мин (mp3 64 kbps mono): ${estChunks} запрос(ов)`
    : `Файл меньше 25 МБ → 1 запрос`);
  console.log(`Оценка стоимости: ${fmtUsd(estCost)} (${PRICES.openai["whisper-1"].perMinute}$/мин)`);

  if (needsSplit && !hasBin("ffmpeg")) die("файл больше 25 МБ, а ffmpeg не найден. Установи: brew install ffmpeg");

  const tmp = needsSplit ? mkdtempSync(join(tmpdir(), "lesson-log-whisper-")) : null;
  try {
    const chunks = needsSplit ? splitAudio(file, tmp) : [file];
    if (needsSplit) {
      console.log(`Нарезано кусков: ${chunks.length}`);
      for (const c of chunks) console.log(`  ${c.split("/").pop()} — ${fmtBytes(fileSize(c))}, ${fmtTime(probeDuration(c))}`);
    }
    if (dryRun) { console.log(); return; }

    const parts = [];
    let offset = 0;
    let totalMs = 0;
    for (const [i, chunk] of chunks.entries()) {
      const { result, elapsedMs } = await timed(() => whisperRequest(key, chunk));
      totalMs += elapsedMs;
      const chunkDuration = probeDuration(chunk) ?? result.duration ?? 0;
      console.log(`  кусок ${i + 1}/${chunks.length}: ${fmtMs(elapsedMs)}, язык ${result.language}, сдвиг ${fmtTime(offset)}`);
      parts.push({ offset, response: result });
      offset += chunkDuration;
    }

    const merged = mergeWhisper(parts);
    writeJson(outPath(base, "whisper.json"), merged);
    writeFileSync(outPath(base, "whisper.txt"), whisperText(merged));
    const cost = audioCost(PRICES.openai["whisper-1"].perMinute, merged.duration);
    meta.whisper = { elapsedMs: totalMs, cost, duration: merged.duration, model: "whisper-1", chunks: chunks.length };
    console.log(`Готово за ${fmtMs(totalMs)}, стоимость ${fmtUsd(cost)} → out/${base}.whisper.{json,txt}\n`);
  } finally {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  }
}

function splitAudio(input, dir) {
  execFileSync("ffmpeg", [
    "-v", "error", "-i", input,
    "-f", "segment", "-segment_time", String(CHUNK_SECONDS), "-reset_timestamps", "1",
    "-c:a", "libmp3lame", "-b:a", "64k", "-ac", "1", "-ar", "16000",
    join(dir, "chunk-%03d.mp3"),
  ], { stdio: "inherit" });
  return readdirSync(dir).filter((f) => f.endsWith(".mp3")).sort().map((f) => join(dir, f));
}

async function whisperRequest(key, chunk) {
  const form = new FormData();
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("file", new Blob([readFileSync(chunk)], { type: MIME[extname(chunk).toLowerCase()] ?? "application/octet-stream" }), chunk.split("/").pop());
  const res = await fetch(WHISPER_URL, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form });
  if (!res.ok) die(`Whisper ${res.status}: ${await res.text()}`);
  return res.json();
}

function mergeWhisper(parts) {
  const segments = [];
  for (const { offset, response } of parts) {
    for (const s of response.segments ?? []) segments.push({ ...s, start: s.start + offset, end: s.end + offset });
  }
  const last = parts.at(-1);
  return {
    model: "whisper-1",
    language: parts[0]?.response.language,
    duration: (last?.offset ?? 0) + (last?.response.duration ?? 0),
    text: parts.map((p) => p.response.text).join(" "),
    segments,
    chunks: parts.map((p) => ({ offset: p.offset, language: p.response.language, duration: p.response.duration })),
  };
}

function whisperText(merged) {
  return merged.segments.map((s) => `[${fmtTime(s.start)}] ${s.text.trim()}`).join("\n") + "\n";
}

import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { readFileSync, writeFileSync } from "node:fs";
import { claudeCost } from "./prices.mjs";
import { die, ensureOut, fmtMs, fmtUsd, outPath, parseArgs, requireEnv, stripExt, timed, writeJson } from "./common.mjs";

const MODELS = {
  sonnet: { id: "claude-sonnet-5", thinking: { type: "adaptive" } },
  haiku: { id: "claude-haiku-4-5-20251001", thinking: { type: "enabled", budget_tokens: 4096 } },
};
const MAX_TOKENS = 32000;
const CHUNK_CHARS = 100_000;

const SYSTEM = `Ты разбираешь транскрипт урока иностранного языка (польский или английский) с репетитором. Речь смешана с русским. Реплики могут быть подписаны как Speaker 0 / Speaker 1 или идти без подписей — сам определи, кто репетитор, а кто студент.

Извлеки из транскрипта все пункты трёх типов:
- correction — репетитор исправляет студента: грамматика, лексика, произношение, порядок слов. original — что сказал студент, corrected — как правильно.
- vocab — новое слово или выражение, которое репетитор объяснял или переводил. original — слово/выражение на изучаемом языке, corrected — перевод или значение.
- rule — явно сформулированное репетитором правило. original — пример или контекст, corrected — правильная форма или формулировка правила кратко.

Для каждого пункта:
- explanation — короткое объяснение по-русски, почему так (1–2 предложения). Если репетитор объяснил — перескажи его объяснение.
- quote — дословная цитата из транскрипта (фрагмент реплики, включая ошибки распознавания), по которой человек найдёт этот момент. Не редактируй цитату.

Не выдумывай исправлений, которых нет в транскрипте. Ошибки распознавания речи — не ошибки студента. Если репетитор просто переспросил или повторил без исправления — это не correction. Если пунктов нет — верни пустой массив.`;

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["correction", "vocab", "rule"] },
          original: { type: "string" },
          corrected: { type: "string" },
          explanation: { type: "string" },
          quote: { type: "string" },
        },
        required: ["type", "original", "corrected", "explanation", "quote"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

const { flags, positional } = parseArgs(process.argv.slice(2));
const file = positional[0];
if (!file) die("использование: node --env-file=.env extract.mjs <transcript.txt> [--model=sonnet|haiku|both] [--dry-run]");
const dryRun = Boolean(flags["dry-run"]);
const modelFlag = flags.model ?? "both";
const selected = modelFlag === "both" ? Object.keys(MODELS) : [modelFlag];
if (selected.some((m) => !MODELS[m])) die("--model принимает sonnet, haiku или both");

ensureOut();
requireEnv("ANTHROPIC_API_KEY", dryRun);
const base = stripExt(file);
const transcript = readFileSync(file, "utf8");
const chunks = splitTranscript(transcript);

console.log(`Транскрипт: ${file}, ${transcript.length} символов, ~${Math.round(transcript.length / 3)} токенов, частей: ${chunks.length}`);
if (dryRun) console.log("Режим --dry-run: запросы не отправляются\n");

const client = dryRun ? null : new Anthropic();
for (const name of selected) await runModel(name);

async function runModel(name) {
  const { id, thinking } = MODELS[name];
  console.log(`== ${name} (${id}) ==`);
  console.log(`POST https://api.anthropic.com/v1/messages (SDK stream), max_tokens=${MAX_TOKENS}, thinking=${JSON.stringify(thinking)}, output_config.format=json_schema`);
  console.log(`system: ${SYSTEM.length} символов; user: ${chunks.length} запрос(ов) по ≤${CHUNK_CHARS} символов`);
  if (dryRun) {
    const est = { input_tokens: Math.round((SYSTEM.length + transcript.length) / 3), output_tokens: 3000 * chunks.length };
    console.log(`Оценка стоимости при ~${est.input_tokens} in / ${est.output_tokens} out: ${fmtUsd(claudeCost(id, est))}\n`);
    return;
  }

  const items = [];
  const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  let totalMs = 0;
  for (const [i, chunk] of chunks.entries()) {
    const { result: message, elapsedMs } = await timed(() =>
      client.messages.stream({
        model: id,
        max_tokens: MAX_TOKENS,
        thinking,
        system: SYSTEM,
        messages: [{ role: "user", content: `Транскрипт${chunks.length > 1 ? ` (часть ${i + 1} из ${chunks.length})` : ""}:\n\n${chunk}` }],
        output_config: { format: jsonSchemaOutputFormat(SCHEMA) },
      }).finalMessage(),
    );
    totalMs += elapsedMs;
    for (const k of Object.keys(usage)) usage[k] += message.usage[k] ?? 0;
    if (message.stop_reason === "refusal") die(`${id}: refusal (${message.stop_details?.category ?? "без категории"})`);
    if (message.stop_reason === "max_tokens") console.warn(`  часть ${i + 1}: обрезано по max_tokens, часть пунктов потеряна`);
    const parsed = message.parsed_output ?? JSON.parse(message.content.find((b) => b.type === "text")?.text ?? '{"items":[]}');
    items.push(...parsed.items);
    console.log(`  часть ${i + 1}/${chunks.length}: ${fmtMs(elapsedMs)}, ${parsed.items.length} пунктов, in ${message.usage.input_tokens} / out ${message.usage.output_tokens}`);
  }

  const cost = claudeCost(id, usage);
  writeJson(outPath(base, `${name}.json`), { model: id, transcript: file, chunks: chunks.length, elapsedMs: totalMs, usage, cost, items });
  writeFileSync(outPath(base, `${name}.md`), toMarkdown(name, id, items));
  const byType = countByType(items);
  console.log(`Итого: ${items.length} пунктов (correction ${byType.correction}, vocab ${byType.vocab}, rule ${byType.rule}), ${fmtMs(totalMs)}`);
  console.log(`Токены: in ${usage.input_tokens}, out ${usage.output_tokens}, стоимость ${fmtUsd(cost)} → out/${base}.${name}.{json,md}\n`);
}

function splitTranscript(text) {
  if (text.length <= CHUNK_CHARS) return [text];
  const parts = [];
  let current = "";
  for (const line of text.split("\n")) {
    if (current.length + line.length + 1 > CHUNK_CHARS && current) {
      parts.push(current);
      current = "";
    }
    current += line + "\n";
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function countByType(items) {
  const c = { correction: 0, vocab: 0, rule: 0 };
  for (const it of items) c[it.type] = (c[it.type] ?? 0) + 1;
  return c;
}

function cell(s) {
  return String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function toMarkdown(name, id, items) {
  const rows = items.map((it) => `| ${it.type} | ${cell(it.original)} | ${cell(it.corrected)} | ${cell(it.explanation)} | ${cell(it.quote)} |`);
  return [`# ${name} (${id}) — ${items.length} пунктов`, "", "| тип | было | стало | правило | цитата |", "|---|---|---|---|---|", ...rows, ""].join("\n");
}

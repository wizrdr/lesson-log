import { existsSync, writeFileSync } from "node:fs";
import { die, fmtBytes, fmtMs, fmtTime, fmtUsd, outPath, parseArgs, readJsonIfExists } from "./common.mjs";

const PROVIDERS = ["deepgram", "whisper"];
const MODELS = ["sonnet", "haiku"];
const SAMPLE = 10;
const PASS = 7;

const { flags, positional } = parseArgs(process.argv.slice(2));
const base = positional[0];
if (!base) die("использование: node compare.mjs <basename> [--dry-run]");
const dryRun = Boolean(flags["dry-run"]);

const inputs = [
  outPath(base, "transcribe.json"),
  ...PROVIDERS.flatMap((p) => MODELS.map((m) => outPath(base, `${p}.${m}.json`))),
];
const reportPath = outPath(base, "report.md");

if (dryRun) {
  console.log("Режим --dry-run. Прочитал бы:");
  for (const f of inputs) console.log(`  ${existsSync(f) ? "есть " : "НЕТ  "} ${f}`);
  console.log(`Записал бы: ${reportPath}`);
  process.exit(0);
}

const meta = readJsonIfExists(inputs[0]);
if (!meta) die(`нет ${inputs[0]} — сначала запусти transcribe.mjs`);

const combos = PROVIDERS.flatMap((p) => MODELS.map((m) => ({ provider: p, model: m, data: readJsonIfExists(outPath(base, `${p}.${m}.json`)) })));
if (combos.every((c) => !c.data)) die("нет ни одного out/<basename>.<provider>.<model>.json — сначала запусти extract.mjs");

const lines = [];
const push = (...l) => lines.push(...l);

push(`# Спайк S0 — ${base}`, "");
push(`Аудио: \`${meta.audio.file}\`, ${fmtBytes(meta.audio.size)}, длительность ${fmtTime(meta.audio.duration)}`, "");

push("## Стоимость и время", "", "| шаг | время | стоимость | детали |", "|---|---|---|---|");
for (const p of PROVIDERS) {
  const t = meta[p];
  push(t ? `| транскрипция ${p} | ${fmtMs(t.elapsedMs)} | ${fmtUsd(t.cost)} | ${t.model}${t.chunks ? `, кусков: ${t.chunks}` : ""} |` : `| транскрипция ${p} | — | — | не запускалась |`);
}
for (const c of combos) {
  const d = c.data;
  push(d ? `| извлечение ${c.provider} → ${c.model} | ${fmtMs(d.elapsedMs)} | ${fmtUsd(d.cost)} | in ${d.usage.input_tokens} / out ${d.usage.output_tokens} |` : `| извлечение ${c.provider} → ${c.model} | — | — | не запускалось |`);
}
const total = [...PROVIDERS.map((p) => meta[p]?.cost ?? 0), ...combos.map((c) => c.data?.cost ?? 0)].reduce((a, b) => a + b, 0);
push(`| **итого** | | **${fmtUsd(total)}** | |`, "");

push("## Число пунктов", "", "| транскрипт → модель | всего | correction | vocab | rule |", "|---|---|---|---|---|");
for (const c of combos) {
  if (!c.data) { push(`| ${c.provider} → ${c.model} | — | — | — | — |`); continue; }
  const n = countByType(c.data.items);
  push(`| ${c.provider} → ${c.model} | ${c.data.items.length} | ${n.correction} | ${n.vocab} | ${n.rule} |`);
}
push("");

push("## Ручная оценка", "", `Критерий из todo.md: из первых ${SAMPLE} пунктов ≥${PASS} — реальные исправления/объяснения репетитора, и в списке есть ошибка, которую ты сам запомнил с урока.`, "", "Отметь `[x]` там, где пункт реальный.", "");
for (const c of combos) {
  push(`### ${c.provider} → ${c.model}`, "");
  if (!c.data) { push("_не запускалось_", ""); continue; }
  const sample = c.data.items.slice(0, SAMPLE);
  if (!sample.length) push("_пунктов нет_");
  for (const [i, it] of sample.entries()) {
    push(`- [ ] ${i + 1}. **${it.type}** «${clean(it.original)}» → «${clean(it.corrected)}»`);
    push(`  - ${clean(it.explanation)}`);
    push(`  - цитата: _${clean(it.quote)}_`);
  }
  push("", `Реальных: __ из ${Math.min(SAMPLE, sample.length)} → ${PASS}+ = пройдено: [ ] да [ ] нет`, "", "Ошибка, которую сам запомнил с урока, в списке есть: [ ] да [ ] нет", "");
}

push("## Решение", "", "- Транскрипция: [ ] Deepgram Nova-3 multi [ ] Whisper — почему: ", "- Модель извлечения: [ ] Sonnet 5 [ ] Haiku 4.5 — почему: ", "- [ ] Kill: транскрипт PL/RU нечитаем у обоих", "");

writeFileSync(reportPath, lines.join("\n"));
console.log(`Сводка: ${reportPath}`);

function countByType(items) {
  const c = { correction: 0, vocab: 0, rule: 0 };
  for (const it of items) c[it.type] = (c[it.type] ?? 0) + 1;
  return c;
}

function clean(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

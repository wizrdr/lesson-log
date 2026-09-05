export const PRICES_CHECKED_2026_09_05 = {
  deepgram: {
    "nova-3": { perMinute: 0.0043 },
    "nova-3-multi": { perMinute: 0.0052 },
  },
  openai: {
    "whisper-1": { perMinute: 0.006 },
  },
  anthropic: {
    "claude-sonnet-5": { inputPerM: 2.0, outputPerM: 10.0, cacheReadPerM: 0.2, cacheWritePerM: 2.5 },
    "claude-haiku-4-5-20251001": { inputPerM: 1.0, outputPerM: 5.0, cacheReadPerM: 0.1, cacheWritePerM: 1.25 },
  },
};

export function audioCost(perMinute, seconds) {
  return (seconds / 60) * perMinute;
}

export function claudeCost(model, usage) {
  const p = PRICES_CHECKED_2026_09_05.anthropic[model];
  if (!p) return null;
  const input = (usage.input_tokens ?? 0) / 1e6 * p.inputPerM;
  const output = (usage.output_tokens ?? 0) / 1e6 * p.outputPerM;
  const cacheRead = (usage.cache_read_input_tokens ?? 0) / 1e6 * p.cacheReadPerM;
  const cacheWrite = (usage.cache_creation_input_tokens ?? 0) / 1e6 * p.cacheWritePerM;
  return input + output + cacheRead + cacheWrite;
}

import Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import { type ExtractedItem, normalizeItems, SCHEMA, splitTranscript, SYSTEM, userPrompt } from './extract-schema.ts'

export const MODEL = 'claude-sonnet-5'
export const MAX_TOKENS = 32000

export type ExtractionMessage = Anthropic.Message & { parsed_output?: unknown }
export type ChunkCaller = (prompt: string) => Promise<ExtractionMessage>

export function claudeCaller(apiKey: string): ChunkCaller {
  const client = new Anthropic({ apiKey, maxRetries: 0 })
  return (prompt) =>
    client.messages
      .stream({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        thinking: { type: 'adaptive' },
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
        output_config: { format: jsonSchemaOutputFormat(SCHEMA) },
      })
      .finalMessage()
}

export function itemsFromMessage(message: ExtractionMessage): ExtractedItem[] {
  if (message.stop_reason === 'refusal') {
    throw new Error(`Claude refused the transcript (${message.stop_details?.category ?? 'no category'})`)
  }
  if (message.stop_reason === 'max_tokens') {
    throw new Error(`Claude output cut off at max_tokens=${MAX_TOKENS}: transcript chunk too dense for one pass`)
  }
  if (message.stop_reason !== 'end_turn') throw new Error(`Claude stopped with ${message.stop_reason ?? 'unknown reason'}`)
  const text = message.content.find((b) => b.type === 'text')?.text
  const output: unknown = message.parsed_output ?? (text ? JSON.parse(text) : undefined)
  return normalizeItems(output)
}

export async function extractItems(transcript: string, call: ChunkCaller): Promise<ExtractedItem[]> {
  const chunks = splitTranscript(transcript)
  const messages = await Promise.all(chunks.map((chunk, i) => call(userPrompt(chunk, i, chunks.length))))
  return messages.flatMap(itemsFromMessage)
}

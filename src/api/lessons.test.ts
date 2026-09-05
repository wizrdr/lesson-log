import { FunctionsHttpError } from '@supabase/supabase-js'

const upload = vi.fn()
const update = vi.fn()
const eq = vi.fn()
const invoke = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1' } } }, error: null }) },
    storage: { from: (bucket: string) => ({ upload: (...args: unknown[]) => upload(bucket, ...args) }) },
    from: (table: string) => ({
      update: (patch: unknown) => {
        update(table, patch)
        return { eq: (...args: unknown[]) => eq(...args) }
      },
    }),
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
  },
  supabaseConfigured: true,
}))

import { uploadAudio } from './lessons'

const file = new File(['audio'], 'lesson.m4a', { type: 'audio/mp4' })

describe('uploadAudio', () => {
  beforeEach(() => {
    upload.mockReset().mockResolvedValue({ data: { path: 'u1/l1.m4a' }, error: null })
    update.mockReset()
    eq.mockReset().mockResolvedValue({ data: null, error: null })
    invoke.mockReset().mockResolvedValue({ data: { ok: true }, error: null })
  })

  it('uploads to audio/{user}/{lesson}.m4a, saves audio_path, then invokes ll-transcribe in that order', async () => {
    await uploadAudio('l1', file)

    expect(upload).toHaveBeenCalledWith('audio', 'u1/l1.m4a', file, { contentType: 'audio/mp4', upsert: true })
    expect(update).toHaveBeenCalledWith('lessons', { audio_path: 'u1/l1.m4a' })
    expect(eq).toHaveBeenCalledWith('id', 'l1')
    expect(invoke).toHaveBeenCalledWith('ll-transcribe', { body: { lessonId: 'l1' } })

    const order = [upload, update, invoke].map((fn) => fn.mock.invocationCallOrder[0])
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it('does not update or invoke when the upload fails', async () => {
    upload.mockResolvedValue({ data: null, error: { message: 'Payload too large' } })

    await expect(uploadAudio('l1', file)).rejects.toThrow('Не удалось загрузить файл: Payload too large')
    expect(update).not.toHaveBeenCalled()
    expect(invoke).not.toHaveBeenCalled()
  })

  it('does not invoke when saving audio_path fails', async () => {
    eq.mockResolvedValue({ data: null, error: { message: 'row not found' } })

    await expect(uploadAudio('l1', file)).rejects.toThrow('Не удалось сохранить путь к файлу: row not found')
    expect(invoke).not.toHaveBeenCalled()
  })

  it('surfaces the error text returned by the edge function', async () => {
    const response = new Response(JSON.stringify({ error: 'DEEPGRAM_API_KEY missing' }), { status: 500 })
    invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(response) })

    await expect(uploadAudio('l1', file)).rejects.toThrow('Не удалось запустить расшифровку: DEEPGRAM_API_KEY missing')
  })
})

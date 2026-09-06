import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ApiKey } from '@/api/types'

const listApiKeys = vi.fn()
const createApiKey = vi.fn()
const revokeApiKey = vi.fn()

vi.mock('@/api/apiKeys', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/apiKeys')>()),
  listApiKeys: () => listApiKeys(),
  createApiKey: (...args: unknown[]) => createApiKey(...args),
  revokeApiKey: (...args: unknown[]) => revokeApiKey(...args),
}))

import { ApiKeysSheet } from './ApiKeysSheet'

const KEY = 'llk_' + 'ab'.repeat(20)

function row(over: Partial<ApiKey> & Pick<ApiKey, 'id' | 'label'>): ApiKey {
  return {
    user_id: 'u1',
    key_hash: 'h'.repeat(64),
    key_prefix: 'abababab',
    created_at: '2026-09-06T10:00:00Z',
    last_used_at: null,
    revoked_at: null,
    ...over,
  }
}

const existing = row({ id: 'k1', label: 'Anki', key_prefix: '12345678', last_used_at: '2026-09-06T12:00:00Z' })

describe('ApiKeysSheet', () => {
  beforeEach(() => {
    listApiKeys.mockReset().mockResolvedValue([existing])
    createApiKey.mockReset()
    revokeApiKey.mockReset().mockResolvedValue(undefined)
  })

  it('lists keys with prefix and usage dates', async () => {
    render(<ApiKeysSheet open onClose={() => {}} />)
    const item = (await screen.findByText('Anki')).closest('li')!
    expect(item).toHaveTextContent('llk_12345678…')
    expect(item).toHaveTextContent('Создан 6 сентября · Использован 6 сентября')
    expect(screen.queryByText(KEY)).toBeNull()
  })

  it('creates a key, shows it exactly once and then keeps only the prefix', async () => {
    const created = row({ id: 'k2', label: 'Скрипт' })
    createApiKey.mockResolvedValue({ key: KEY, row: created })
    render(<ApiKeysSheet open onClose={() => {}} />)
    await screen.findByText('Anki')

    fireEvent.click(screen.getByRole('button', { name: 'Создать ключ' }))
    const confirm = screen.getByRole('button', { name: 'Создать' })
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Скрипт' } })
    fireEvent.click(confirm)

    await waitFor(() => expect(createApiKey).toHaveBeenCalledWith('Скрипт'))
    const fresh = await screen.findByRole('region', { name: 'Ваш новый ключ' })
    expect(fresh).toHaveTextContent(KEY)
    expect(fresh).toHaveTextContent('Больше он не отобразится')
    expect(within(fresh).getByRole('button', { name: 'Скопировать' })).toBeInTheDocument()

    fireEvent.click(within(fresh).getByRole('button', { name: 'Готово' }))
    expect(screen.queryByText(KEY)).toBeNull()
    expect(screen.getByText('Скрипт').closest('li')).toHaveTextContent('llk_abababab…')
    expect(screen.getByText('Скрипт').closest('li')).toHaveTextContent('Ещё не использовался')
  })

  it('revokes a key and drops it from the list', async () => {
    render(<ApiKeysSheet open onClose={() => {}} />)
    const item = (await screen.findByText('Anki')).closest('li')!
    fireEvent.click(within(item).getByRole('button', { name: 'Отозвать' }))
    await waitFor(() => expect(revokeApiKey).toHaveBeenCalledWith('k1'))
    await waitFor(() => expect(screen.queryByText('Anki')).toBeNull())
    expect(screen.getByText('Ключей пока нет.')).toBeInTheDocument()
  })

  it('shows a curl example on the function URL under "how to use"', async () => {
    render(<ApiKeysSheet open onClose={() => {}} />)
    await screen.findByText('Anki')
    expect(screen.getByText('Как пользоваться')).toBeInTheDocument()
    const pre = document.querySelector('pre')!
    expect(pre.textContent).toContain('/functions/v1/ll-cards')
    expect(pre.textContent).toContain('Authorization: Bearer llk_')
    expect(pre.textContent).toContain('"cards"')
  })
})

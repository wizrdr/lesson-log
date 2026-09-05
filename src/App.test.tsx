import { render, screen } from '@testing-library/react'

vi.mock('@/lib/supabase', () => ({ supabase: null, supabaseConfigured: false }))

import App from './App'

describe('App', () => {
  it('shows the setup notice instead of any page when Supabase is not configured', () => {
    render(<App />)
    expect(screen.getByText('Supabase не настроен')).toBeInTheDocument()
    expect(screen.queryByText('Уроков пока нет')).toBeNull()
  })
})

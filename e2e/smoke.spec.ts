import { expect, test } from '@playwright/test'

test('entry screen renders: login or setup notice', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: /^Войти$/ }).or(page.getByText(/VITE_SUPABASE_URL/)),
  ).toBeVisible()
})

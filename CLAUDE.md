# Lesson Log

Журнал ошибок после уроков с репетитором: запись урока → транскрипт → LLM вытаскивает исправления, слова и правила → карточки SRS → экран «перед уроком». Два пользователя (Максим и жена), iPhone + Mac как PWA.
План и решения: `tasks/todo.md`. Уроки: `tasks/lessons.md`.

## Стек
React 19 + Vite + TypeScript + Tailwind v4 + react-router, `ts-fsrs` для повторения. Supabase (Postgres + Auth + Storage + Realtime + Edge Functions). Хостинг: GitHub Pages через Actions.

## Supabase
- Проект общий с Dayline (ref `ghuhochssdbzyxextlso`), все таблицы в схеме `lesson_log`. Клиент создаётся с `db: { schema: 'lesson_log' }` — в Edge Functions тоже.
- История миграций в проекте общая с dayline, поэтому `db push` не работает ни в одном из репо (требует локальные файлы всех удалённых версий). Новая миграция = файл `YYYYMMDDHHMMSS_name.sql` + `scripts/db-migrate.sh <файл>` (выполняет `db query -f` и `migration repair --status applied`).
- Схему `lesson_log` нужно добавить в exposed schemas API (Dashboard → Settings → API), иначе PostgREST её не видит.
- Edge Functions называются с префиксом: `ll-transcribe`, `ll-extract`, чтобы не путать с функциями dayline.
- `ll-transcribe` отдаёт Deepgram callback-URL `${SUPABASE_URL}/functions/v1/ll-extract?lesson=<id>&token=<CALLBACK_TOKEN>`; `ll-extract` деплоится с `verify_jwt = false` и пускает только запросы с верным `token` (секрет `CALLBACK_TOKEN`, любая длинная случайная строка). Секреты функций: `supabase/functions/.env.example`.
- Аудио: bucket `audio`, путь `{user_id}/{lesson_id}.m4a`; после обработки файл удаляется.

## API
- Endpoint: `POST ${SUPABASE_URL}/functions/v1/ll-cards` (Edge Function `ll-cards`, `verify_jwt = false`, авторизация своя). `GET` туда же — `{ deck: { due, total } }` для проверки ключа.
- Заголовок: `Authorization: Bearer <ключ>`. Ключ `llk_` + 40 hex — ищется по SHA-256 в `lesson_log.api_keys` (`revoked_at is null`, обновляет `last_used_at`); всё остальное трактуется как Supabase JWT и проверяется через `auth.getUser` — приложение и скрипты ходят в одну точку.
- Тело: `{ "cards": [{ "type": "vocab"|"correction"|"rule", "original", "corrected"?, "explanation"?, "lang"?: "pl"|"en" }] }`, 1–100 штук; ошибки валидации — 400 с индексом и полем.
- Ответ: `201 { created: [{id, original}], skipped: [{id, original}] }`; `skipped` — уже есть не удалённая запись с тем же `type` + `original` (без регистра/trim). Вставляет `entries` (`lesson_id null`) + `cards` (`due = now()`).
- Ключи создаются в приложении: Журнал → иконка ключа. Сам ключ показывается один раз, в БД только `key_hash` и `key_prefix`. Парсинг/дедуп: `_shared/cards-input.ts`, хеш: `_shared/api-key.ts` (общий с клиентом `src/api/apiKeys.ts`).

## Правила
- Без local-first: UI читает и пишет Supabase напрямую через `src/api`. Никаких IndexedDB, stores-синков и очередей.
- Дизайн-система: цвета, отступы, радиусы только через токены `src/styles/tokens.css` и утилиты Tailwind, замапленные в `src/index.css`. В `src/features` и `src/ui` запрещены палитровые классы Tailwind (`bg-gray-*`, `text-slate-*`) и hex-цвета — это проверяет `src/test/tokens-lint.test.ts`. Фичи собираются из примитивов `src/ui`.
- Типы строк БД: `src/api/types.ts` зеркалит миграцию; меняешь одно — меняешь другое.
- Комментарии в коде: по умолчанию нет; если нужен, одна строка на английском, только WHY.
- Проверка перед «готово»: `npm run lint`, `npm test`, `npm run build`. Dev-серверы не запускать без явной просьбы.

## Команды
```
npm run dev        # http://localhost:5173
npm run lint       # oxlint
npm test           # vitest run
npm run build      # tsc -b && vite build
npm run e2e        # Playwright (поднимает vite на 5174)
scripts/db-migrate.sh supabase/migrations/<file>.sql   # миграции (db push не работает, см. выше)
npx supabase secrets set DEEPGRAM_API_KEY=... ANTHROPIC_API_KEY=... CALLBACK_TOKEN=...   # секреты функций
npx supabase functions deploy ll-transcribe && npx supabase functions deploy ll-extract # edge functions
npx supabase functions deploy ll-cards --no-verify-jwt                                  # API карточек (см. config.toml)
cd supabase/functions && deno check ll-transcribe/index.ts ll-extract/index.ts ll-cards/index.ts  # типы функций
cd supabase/functions && deno test --allow-env --allow-read                             # Deno-тесты функций
```

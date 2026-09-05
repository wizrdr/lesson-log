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
cd supabase/functions && deno check ll-transcribe/index.ts ll-extract/index.ts          # типы функций
cd supabase/functions && deno test --allow-env --allow-read                             # Deno-тесты функций
```

# Спайк S0: Deepgram vs Whisper, Sonnet 5 vs Haiku 4.5

Нужны Node ≥ 20, `ffmpeg` (`brew install ffmpeg`) и ключи в `.env` (см. `.env.example`): `DEEPGRAM_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`.

Запись урока: Zoom → «Record on this computer» → после звонка в папке `~/Documents/Zoom/<дата>/` лежит `audio_only.m4a`. Voice Memos на iPhone → запись → «Поделиться» → «Сохранить в Файлы» → перекинуть на Mac (AirDrop или iCloud Drive), файл `.m4a`.

```sh
cd spike && npm install
node --env-file=.env transcribe.mjs ~/Documents/Zoom/2026-09-10/audio_only.m4a
node --env-file=.env extract.mjs out/audio_only.deepgram.txt && node --env-file=.env extract.mjs out/audio_only.whisper.txt
node compare.mjs audio_only
```

Результаты в `out/`: транскрипты `<имя>.deepgram.txt` / `<имя>.whisper.txt`, извлечения `<имя>.<провайдер>.<модель>.md`, сводка с чекбоксами `<имя>.report.md`. Флаги: `--only=deepgram|whisper`, `--model=sonnet|haiku|both`, `--dry-run` у всех трёх.

# Novel AI Studio

เว็บจัดการโปรเจกต์นิยายด้วย React + TypeScript + Vite + Supabase Auth
ธีมชมพู-ม่วงพาสเทล

## Requirements
- Node.js 20.19+ หรือ 22.12+
- npm

## Run locally
```bash
npm install
npm run dev
```
เปิด URL ที่ Vite แสดง (โดยทั่วไปคือ http://localhost:5173)

## Supabase setup
Create a `.env.local` file with `VITE_SUPABASE_URL` and either
`VITE_SUPABASE_PUBLISHABLE_KEY` or the legacy `VITE_SUPABASE_ANON_KEY`.
Use only a Publishable/Anon key in this frontend. Never use a Supabase
Secret/service_role key or an AI provider secret in a `VITE_*` variable.
Restart the Vite server after changing environment variables.

Google sign-in is handled by Supabase Auth. Configure the Google provider and
redirect URLs in the confirmed Supabase project before using that option.

## AI Edge Function

The `novel-ai` Edge Function checks the Supabase access token, validates and
limits requests, then calls the OpenAI Responses API using `gpt-4.1-mini`.
It supports separate outline, character, and one-chapter-at-a-time generation.
The OpenAI key belongs only in Supabase Function Secrets.

After confirming the currently linked Supabase project and authenticating the
Supabase CLI in a trusted terminal, create a local `.env.supabase` file (ignored
by Git) with `OPENAI_API_KEY=<your key>`, then run:

```powershell
supabase secrets set --env-file .env.supabase
Remove-Item .env.supabase
supabase functions deploy novel-ai
```

Do not run these commands until you have verified that the CLI is linked to the
intended project. Do not put an OpenAI key in `.env`, `.env.local`, frontend
code, or chat. `supabase/config.toml` keeps JWT verification enabled.

## Production build
```bash
npm run build
npm run preview
```

## Current status and limitations

- The Dashboard and library load novels and saved chapter counts from Supabase;
  creating, editing, and deleting novels use the signed-in user's session and
  the verified owner RLS policies.
- The AI controls call the deployed `novel-ai` Edge Function for outlines,
  characters, and one chapter per request. Generated outlines, characters,
  chapter text, and continuity notes are saved to their corresponding Supabase
  tables and can be reopened in the reader.
- The reader provides a chapter list, chapter navigation, and a distraction-free
  reading layout. No sample novels are automatically shown as real projects.
- `generation_jobs` currently has a SELECT-only RLS policy, so the browser does
  not write generation job records. Background generation is not implemented.
- DOCX/PDF export is not implemented.

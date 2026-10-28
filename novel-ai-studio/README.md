# Novel AI Studio

<<<<<<< HEAD
เว็บสำหรับสร้าง เขียน และอ่านนิยายด้วย React + TypeScript + Vite + Tailwind CSS
=======
เว็บจัดการโปรเจกต์นิยายด้วย React + TypeScript + Vite + Supabase Auth
>>>>>>> bdee6feef93e04f1ca58e5d2b422188b6f75ad01
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
For Firebase sign-in, also set the four `VITE_FIREBASE_*` values shown in
`.env.example`. Restart the Vite server after changing environment variables.
Use only a Publishable/Anon key in this frontend. Never use a Supabase
Secret/service_role key or an AI provider secret in a `VITE_*` variable.

## AI chapter generation
The create-novel form writes the first chapter with OpenAI. Open a terminal in
this project, link the Supabase project, set the server-side secrets, and deploy
the Edge Function:

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase secrets set OPENAI_API_KEY=your-openai-api-key FIREBASE_PROJECT_ID=your-firebase-project-id
npx supabase functions deploy novel-ai
```

`OPENAI_API_KEY` is only used by the Edge Function and must never be placed in
`.env.local` or a `VITE_*` variable. `FIREBASE_PROJECT_ID` is required when
users sign in with Firebase; Supabase-authenticated users are verified through
Supabase Auth. The function accepts either authenticated provider and validates
the bearer token before calling OpenAI.

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

<<<<<<< HEAD
นิยายและบทที่ AI เขียนจะถูกเก็บใน `localStorage` ของเบราว์เซอร์ที่ใช้งาน
เปิดนิยายจากคลังเพื่ออ่านบทที่บันทึกไว้ และกดเขียนบทถัดไปได้ตามจำนวนเป้าหมาย
แต่ละบทจะส่งเนื้อหาบทก่อนหน้าให้ AI ใช้รักษาความต่อเนื่อง
=======
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
>>>>>>> bdee6feef93e04f1ca58e5d2b422188b6f75ad01

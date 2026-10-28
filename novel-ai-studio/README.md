# Novel AI Studio

เว็บสำหรับสร้าง เขียน และอ่านนิยายด้วย React + TypeScript + Vite + Tailwind CSS
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

## Production build
```bash
npm run build
npm run preview
```

นิยายและบทที่ AI เขียนจะถูกเก็บใน `localStorage` ของเบราว์เซอร์ที่ใช้งาน
เปิดนิยายจากคลังเพื่ออ่านบทที่บันทึกไว้ และกดเขียนบทถัดไปได้ตามจำนวนเป้าหมาย
แต่ละบทจะส่งเนื้อหาบทก่อนหน้าให้ AI ใช้รักษาความต่อเนื่อง

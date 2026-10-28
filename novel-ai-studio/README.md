# Novel AI Studio

เว็บต้นแบบสำหรับจัดการโปรเจกต์นิยายด้วย React + TypeScript + Vite + Tailwind CSS
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

## Production build
```bash
npm run build
npm run preview
```

## Current prototype scope
- Dashboard แสดงนิยายตัวอย่างและความคืบหน้า
- สร้างโปรเจกต์นิยายจากชื่อ แนวเรื่อง ไอเดียหลัก และจำนวนบท
- ค้นหานิยายในรายการ
- แก้ไขชื่อ/รายละเอียดและลบโปรเจกต์ตัวอย่าง
- เก็บข้อมูลฝั่งเบราว์เซอร์ด้วย localStorage

## Not connected yet
Supabase authentication/database, AI provider, background generation worker, real 30-chapter generation,
continuity validation and DOCX/PDF export are not implemented in this starter. The "เริ่มวางพล็อตด้วย AI"
button is a UI placeholder until a secure server-side generation API is added.

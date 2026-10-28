import { createClient } from "@supabase/supabase-js";
import { createRemoteJWKSet, jwtVerify } from "jose";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const firebaseJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function isAuthorized(request: Request) {
  const token = request.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return false;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")
    ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

  if (supabaseUrl && supabaseKey) {
    const client = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (!error && data.user) return true;
  }

  const firebaseProjectId = Deno.env.get("FIREBASE_PROJECT_ID");
  if (!firebaseProjectId) return false;

  try {
    await jwtVerify(token, firebaseJwks, {
      issuer: `https://securetoken.google.com/${firebaseProjectId}`,
      audience: firebaseProjectId,
    });
    return true;
  } catch {
    return false;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "รองรับเฉพาะคำขอ POST" }, 405);
  }
  if (!await isAuthorized(request)) {
    return jsonResponse({ error: "กรุณาเข้าสู่ระบบใหม่ก่อนให้ AI เขียนนิยาย" }, 401);
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return jsonResponse({
      error: "ยังไม่ได้ตั้งค่า OPENAI_API_KEY ใน Supabase Edge Function Secrets",
    }, 503);
  }

  let input: {
    title?: unknown;
    genre?: unknown;
    premise?: unknown;
    chapterNumber?: unknown;
    previousChapter?: { title?: unknown; content?: unknown } | null;
  };
  try {
    input = await request.json();
  } catch {
    return jsonResponse({ error: "ข้อมูลคำขอไม่ใช่ JSON ที่ถูกต้อง" }, 400);
  }

  const title = typeof input.title === "string" ? input.title.trim() : "";
  const genre = typeof input.genre === "string" ? input.genre.trim() : "";
  const premise = typeof input.premise === "string" ? input.premise.trim() : "";
  const chapterNumber = input.chapterNumber;
  const previousTitle = typeof input.previousChapter?.title === "string"
    ? input.previousChapter.title.slice(0, 200)
    : "";
  const previousContent = typeof input.previousChapter?.content === "string"
    ? input.previousChapter.content.slice(-12_000)
    : "";

  if (
    !title
    || title.length > 120
    || !genre
    || genre.length > 80
    || premise.length > 3_000
    || typeof chapterNumber !== "number"
    || !Number.isInteger(chapterNumber)
    || Number(chapterNumber) < 1
    || Number(chapterNumber) > 100
  ) {
    return jsonResponse({ error: "ข้อมูลนิยายไม่ครบหรือเกินขนาดที่กำหนด" }, 400);
  }

  const systemPrompt = [
    "คุณเป็นนักเขียนนิยายภาษาไทยมืออาชีพ เขียนร้อยแก้วที่ลื่นไหล มีฉาก บทสนทนา และอารมณ์ตัวละครชัดเจน",
    "แต่งตอนต่อเนื่องตามแนวเรื่องและเรื่องย่อ ห้ามขัดแย้งกับข้อมูลก่อนหน้า และห้ามสรุปแทนการเล่าเป็นฉาก",
    "เขียนหนึ่งบทจบในตอน มีความยาวเหมาะสำหรับอ่านจริงประมาณ 1,000-1,500 คำภาษาไทย",
    "ตอบเป็น JSON object เท่านั้น โดยมีคีย์ title (ชื่อบทสั้น ๆ) และ content (เนื้อหาบทเต็ม ใช้บรรทัดใหม่แบ่งย่อหน้า)",
  ].join("\n");
  const userPrompt = [
    `ชื่อเรื่อง: ${title}`,
    `แนวนิยาย: ${genre}`,
    `ไอเดียหลัก: ${premise || "ผู้เขียนยังไม่ได้ระบุไอเดียเพิ่มเติม"}`,
    `เขียนบทที่: ${chapterNumber}`,
    previousContent
      ? `บทก่อนหน้า (${previousTitle}):\n${previousContent}\n\nเขียนบทต่อไปโดยเริ่มจากผลของเหตุการณ์ข้างต้น`
      : "นี่คือบทแรก ปูตัวละครและสถานการณ์ให้น่าสนใจโดยไม่เร่งสรุปเรื่อง",
  ].join("\n\n");

  let openAiResponse: Response;
  try {
    openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(90_000),
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 4_000,
        temperature: 0.8,
      }),
    });
  } catch (error) {
    console.error("OpenAI request failed:", error);
    return jsonResponse({ error: "เชื่อมต่อบริการ AI ไม่สำเร็จ กรุณาลองอีกครั้ง" }, 502);
  }

  if (!openAiResponse.ok) {
    const detail = await openAiResponse.json().catch(() => null) as {
      error?: { message?: string };
    } | null;
    console.error("OpenAI returned an error:", openAiResponse.status, detail?.error?.message);
    const message = openAiResponse.status === 401
      ? "คีย์ OPENAI_API_KEY ไม่ถูกต้อง"
      : openAiResponse.status === 429
        ? "คำขอ AI เกินโควตาหรือมีการใช้งานถี่เกินไป กรุณาตรวจสอบโควตาแล้วลองใหม่"
        : "บริการ AI ตอบกลับผิดพลาด กรุณาลองอีกครั้ง";
    return jsonResponse({ error: message }, 502);
  }

  let completion: { choices?: Array<{ message?: { content?: string | null } }> };
  try {
    completion = await openAiResponse.json();
  } catch {
    return jsonResponse({ error: "รูปแบบคำตอบจากบริการ AI ไม่ถูกต้อง กรุณาลองอีกครั้ง" }, 502);
  }
  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    return jsonResponse({ error: "AI ไม่ได้ส่งเนื้อหาบทกลับมา กรุณาลองอีกครั้ง" }, 502);
  }

  let chapter: { title?: unknown; content?: unknown };
  try {
    chapter = JSON.parse(content);
  } catch {
    console.error("OpenAI returned invalid chapter JSON");
    return jsonResponse({ error: "รูปแบบคำตอบจาก AI ไม่ถูกต้อง กรุณาลองอีกครั้ง" }, 502);
  }

  if (
    typeof chapter.title !== "string"
    || typeof chapter.content !== "string"
    || !chapter.title.trim()
    || !chapter.content.trim()
  ) {
    return jsonResponse({ error: "AI ส่งข้อมูลบทนิยายกลับมาไม่ครบ กรุณาลองอีกครั้ง" }, 502);
  }

  return jsonResponse({
    title: chapter.title.trim().slice(0, 200),
    content: chapter.content.trim().slice(0, 50_000),
  });
});

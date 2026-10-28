<<<<<<< HEAD
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
=======
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MAX_BODY_BYTES = 96_000;
const MAX_REQUESTS_PER_MINUTE = 6;
const RATE_WINDOW_MS = 60_000;
const rateHistory = new Map<string, number[]>();
let requestsSinceCleanup = 0;

type Action = "outline" | "characters" | "chapter";
type RequestPayload = {
  action: Action;
  novel: {
    title: string;
    genre: string;
    premise: string;
    chaptersTarget: number;
  };
  outline?: unknown;
  characters?: unknown;
  previousChapters?: unknown;
  chapterNumber?: number;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validatePayload(value: unknown): RequestPayload | null {
  if (!isRecord(value) || !isRecord(value.novel)) return null;
  const { action, novel } = value;
  if (action !== "outline" && action !== "characters" && action !== "chapter") return null;
  if (
    typeof novel.title !== "string" || novel.title.trim().length === 0 || novel.title.length > 120
    || typeof novel.genre !== "string" || novel.genre.length > 40
    || typeof novel.premise !== "string" || novel.premise.length > 3_000
    || typeof novel.chaptersTarget !== "number" || !Number.isInteger(novel.chaptersTarget)
    || novel.chaptersTarget < 1 || novel.chaptersTarget > 100
  ) return null;

  if (action === "chapter") {
    if (
      typeof value.chapterNumber !== "number"
      || !Number.isInteger(value.chapterNumber)
      || value.chapterNumber < 1
      || value.chapterNumber > novel.chaptersTarget
    ) return null;
  }

  const context = JSON.stringify({
    outline: value.outline ?? null,
    characters: value.characters ?? null,
    previousChapters: value.previousChapters ?? null,
  });
  if (context.length > 28_000) return null;

  return value as RequestPayload;
}

function buildInstructions(payload: RequestPayload) {
  const novel = payload.novel;
  const shared = `เขียนภาษาไทยอย่างเป็นธรรมชาติและคงความต่อเนื่องของเรื่อง
เรื่อง: ${novel.title}
แนว: ${novel.genre}
ไอเดียหลัก: ${novel.premise || "ผู้เขียนยังไม่ได้ระบุ"}
จำนวนบทเป้าหมาย: ${novel.chaptersTarget}
ตอบเป็น JSON ที่ถูกต้องตามรูปแบบที่กำหนดเท่านั้น ห้ามใส่ Markdown code fence`;

  if (payload.action === "outline") {
    return `${shared}
สร้างโครงเรื่องครบ ${novel.chaptersTarget} บท แต่สรุปสั้น กระชับ เพื่อควบคุมขนาดผลลัพธ์
รูปแบบ: {"logline":string,"synopsis":string,"themes":string[],"chapters":[{"number":number,"title":string,"summary":string,"keyEvents":string[],"cliffhanger":string}],"continuitySummary":string}
หนึ่งบทมี summary ไม่เกิน 180 ตัวอักษร, keyEvents ไม่เกิน 2 ข้อ และ cliffhanger สั้นกระชับ`;
  }

  if (payload.action === "characters") {
    return `${shared}
สร้างตัวละครหลักและตัวละครสนับสนุนที่จำเป็นต่อเรื่อง
รูปแบบ: {"characters":[{"name":string,"role":string,"description":string,"motivation":string,"arc":string,"relationships":string[]}]}
จำกัดจำนวนตัวละครไว้ไม่เกิน 10 ตัว`;
  }

  return `${shared}
สร้างเฉพาะบทที่ ${payload.chapterNumber} จาก ${novel.chaptersTarget} บท ไม่เขียนบทอื่น
ใช้โครงเรื่อง ตัวละคร สรุปบทก่อนหน้า และข้อมูลความต่อเนื่องที่ให้มาเป็นข้อเท็จจริงหลัก
ความยาวเนื้อหาไม่เกิน 4,500 ตัวอักษร
รูปแบบ: {"chapterNumber":number,"title":string,"content":string,"summary":string,"keyEvents":string[],"continuityUpdates":string[],"unresolvedThreads":string[]}`;
}

function isValidResult(payload: RequestPayload, result: unknown) {
  if (!isRecord(result)) return false;
  if (payload.action === "outline") {
    return typeof result.logline === "string"
      && typeof result.synopsis === "string"
      && Array.isArray(result.chapters)
      && result.chapters.length === payload.novel.chaptersTarget
      && result.chapters.every((chapter, index) => isRecord(chapter)
        && chapter.number === index + 1
        && typeof chapter.title === "string"
        && typeof chapter.summary === "string"
        && Array.isArray(chapter.keyEvents)
        && chapter.keyEvents.every((event) => typeof event === "string")
        && typeof chapter.cliffhanger === "string")
      && typeof result.continuitySummary === "string";
  }
  if (payload.action === "characters") {
    return Array.isArray(result.characters)
      && result.characters.length <= 10
      && result.characters.every((character) => isRecord(character)
        && typeof character.name === "string"
        && typeof character.role === "string"
        && typeof character.description === "string"
        && typeof character.motivation === "string"
        && typeof character.arc === "string"
        && Array.isArray(character.relationships)
        && character.relationships.every((relationship) => typeof relationship === "string"));
  }
  return result.chapterNumber === payload.chapterNumber
    && typeof result.title === "string"
    && typeof result.content === "string"
    && result.content.length <= 6_000
    && typeof result.summary === "string"
    && Array.isArray(result.keyEvents)
    && result.keyEvents.every((event) => typeof event === "string")
    && Array.isArray(result.continuityUpdates)
    && result.continuityUpdates.every((item) => typeof item === "string")
    && Array.isArray(result.unresolvedThreads)
    && result.unresolvedThreads.every((item) => typeof item === "string");
}

function checkRateLimit(userId: string) {
  const now = Date.now();
  requestsSinceCleanup += 1;
  if (requestsSinceCleanup >= 100) {
    for (const [id, timestamps] of rateHistory) {
      if (!timestamps.some((time) => now - time < RATE_WINDOW_MS)) rateHistory.delete(id);
    }
    requestsSinceCleanup = 0;
  }
  const recent = (rateHistory.get(userId) ?? []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_MINUTE) return false;
  recent.push(now);
  rateHistory.set(userId, recent);
  return true;
}

async function readLimitedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new RangeError("Request body exceeds limit");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  const tokenMatch = authorization?.match(/^Bearer\s+(\S+)$/i);
  if (!tokenMatch) return jsonResponse({ error: "Authentication required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!supabaseUrl || !supabaseKey || !openAiKey) {
    return jsonResponse({ error: "Server configuration is incomplete" }, 500);
  }

  const authClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let userId: string;
  try {
    const { data, error } = await authClient.auth.getUser(tokenMatch[1]);
    if (error || !data.user) return jsonResponse({ error: "Invalid or expired session" }, 401);
    userId = data.user.id;
  } catch {
    return jsonResponse({ error: "Unable to verify session" }, 503);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return jsonResponse({ error: "Request is too large" }, 413);

  let rawBody: string;
  try {
    rawBody = await readLimitedBody(request);
  } catch (error) {
    if (error instanceof RangeError) return jsonResponse({ error: "Request is too large" }, 413);
    return jsonResponse({ error: "Unable to read request body" }, 400);
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Request must contain valid JSON" }, 400);
  }
  const payload = validatePayload(parsedBody);
  if (!payload) return jsonResponse({ error: "Invalid generation request" }, 400);
  if (!checkRateLimit(userId)) return jsonResponse({ error: "Rate limit exceeded; try again shortly" }, 429);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        instructions: buildInstructions(payload),
        input: JSON.stringify({
          outline: payload.outline ?? null,
          characters: payload.characters ?? null,
          previousChapters: payload.previousChapters ?? null,
          chapterNumber: payload.chapterNumber ?? null,
        }),
        max_output_tokens: payload.action === "outline" ? 8_000 : payload.action === "chapter" ? 6_000 : 3_000,
        text: { format: { type: "json_object" } },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 429) return jsonResponse({ error: "AI service is rate limited; try again shortly" }, 503);
      if (response.status >= 500) return jsonResponse({ error: "AI service is temporarily unavailable" }, 502);
      return jsonResponse({ error: "AI request was rejected; check the request and API configuration" }, 502);
    }

    const responseBody: unknown = await response.json();
    if (!isRecord(responseBody) || !Array.isArray(responseBody.output)) {
      return jsonResponse({ error: "AI returned an invalid response" }, 502);
    }
    const text = responseBody.output
      .filter(isRecord)
      .flatMap((item) => Array.isArray(item.content) ? item.content : [])
      .filter(isRecord)
      .find((item) => item.type === "output_text" && typeof item.text === "string")?.text;
    if (typeof text !== "string") return jsonResponse({ error: "AI returned no generated content" }, 502);

    let result: unknown;
    try {
      result = JSON.parse(text);
    } catch {
      return jsonResponse({ error: "AI returned malformed generated content" }, 502);
    }
    if (!isValidResult(payload, result)) {
      return jsonResponse({ error: "AI returned content in an unexpected format" }, 502);
    }

    return jsonResponse({ result });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return jsonResponse({ error: "AI request timed out; please retry" }, 504);
    }
    return jsonResponse({ error: "Unable to reach the AI service" }, 502);
  } finally {
    clearTimeout(timeout);
  }
>>>>>>> bdee6feef93e04f1ca58e5d2b422188b6f75ad01
});

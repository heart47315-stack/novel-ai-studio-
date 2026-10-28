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
});

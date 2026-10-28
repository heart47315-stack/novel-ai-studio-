<<<<<<< HEAD
import { supabase, supabaseConfigurationError } from './supabase'

export interface GeneratedChapter {
  title: string
  content: string
}

export interface GenerateChapterInput {
  title: string
  genre: string
  premise: string
  chapterNumber: number
  previousChapter: { title: string; content: string } | null
}

export async function generateNovelChapter(
  input: GenerateChapterInput,
  accessToken: string,
): Promise<GeneratedChapter> {
  if (!supabase) {
    throw new Error(
      supabaseConfigurationError ?? 'ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase',
    )
  }

  const { data, error } = await supabase.functions.invoke<GeneratedChapter>(
    'novel-ai',
    {
      body: input,
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )

  if (error) {
    if (error.context instanceof Response) {
      const body = await error.context.text()
      let responseMessage: unknown
      try {
        responseMessage = (JSON.parse(body) as { error?: unknown }).error
      } catch {
        // Keep the SDK error when the function response is not JSON.
      }
      if (typeof responseMessage === 'string') throw new Error(responseMessage)
    }

    throw new Error(error.message || 'AI เขียนบทไม่สำเร็จ กรุณาลองอีกครั้ง')
  }

  if (
    !data
    || typeof data.title !== 'string'
    || typeof data.content !== 'string'
    || !data.title.trim()
    || !data.content.trim()
  ) {
    throw new Error('AI ส่งข้อมูลบทนิยายกลับมาไม่ครบ กรุณาลองอีกครั้ง')
  }

  return { title: data.title.trim(), content: data.content.trim() }
}
=======
import { supabase } from './supabase';
import type { Novel } from '../types';

type NovelContext = Pick<Novel, 'title' | 'genre' | 'premise' | 'chaptersTarget'>;

export interface NovelOutline {
  logline: string;
  synopsis: string;
  themes: string[];
  chapters: Array<{
    number: number;
    title: string;
    summary: string;
    keyEvents: string[];
    cliffhanger: string;
  }>;
  continuitySummary: string;
}

export interface NovelCharacter {
  name: string;
  role: string;
  description: string;
  motivation: string;
  arc: string;
  relationships: string[];
}

export interface GeneratedChapter {
  chapterNumber: number;
  title: string;
  content: string;
  summary: string;
  keyEvents: string[];
  continuityUpdates: string[];
  unresolvedThreads: string[];
}

type PreviousChapter = Pick<GeneratedChapter, 'chapterNumber' | 'title' | 'summary' | 'keyEvents'>;

type GenerationRequest =
  | { action: 'outline'; novel: NovelContext }
  | { action: 'characters'; novel: NovelContext; outline: NovelOutline | null }
  | {
      action: 'chapter';
      novel: NovelContext;
      outline: NovelOutline | null;
      characters: NovelCharacter[];
      previousChapters: PreviousChapter[];
      chapterNumber: number;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNovelOutline(value: unknown): value is NovelOutline {
  if (!isRecord(value)) return false;
  return typeof value.logline === 'string'
    && typeof value.synopsis === 'string'
    && isStringArray(value.themes)
    && Array.isArray(value.chapters)
    && value.chapters.every((chapter) => isRecord(chapter)
      && Number.isInteger(chapter.number)
      && typeof chapter.title === 'string'
      && typeof chapter.summary === 'string'
      && isStringArray(chapter.keyEvents)
      && typeof chapter.cliffhanger === 'string')
    && typeof value.continuitySummary === 'string';
}

function isCharacterResult(value: unknown): value is { characters: NovelCharacter[] } {
  if (!isRecord(value) || !Array.isArray(value.characters)) return false;
  return value.characters.every((character) => isRecord(character)
    && typeof character.name === 'string'
    && typeof character.role === 'string'
    && typeof character.description === 'string'
    && typeof character.motivation === 'string'
    && typeof character.arc === 'string'
    && isStringArray(character.relationships));
}

function isGeneratedChapter(value: unknown): value is GeneratedChapter {
  if (!isRecord(value)) return false;
  return Number.isInteger(value.chapterNumber)
    && typeof value.title === 'string'
    && typeof value.content === 'string'
    && typeof value.summary === 'string'
    && isStringArray(value.keyEvents)
    && isStringArray(value.continuityUpdates)
    && isStringArray(value.unresolvedThreads);
}

async function responseError(error: { context?: unknown; message: string }) {
  if (error.context instanceof Response) {
    try {
      const body: unknown = await error.context.json();
      if (isRecord(body) && typeof body.error === 'string') return body.error;
    } catch {
      // The response body may not be JSON.
    }
  }
  return error.message || 'เรียกใช้ AI ไม่สำเร็จ กรุณาลองใหม่';
}

export function generateNovelContent(request: Extract<GenerationRequest, { action: 'outline' }>): Promise<NovelOutline>;
export function generateNovelContent(request: Extract<GenerationRequest, { action: 'characters' }>): Promise<{ characters: NovelCharacter[] }>;
export function generateNovelContent(request: Extract<GenerationRequest, { action: 'chapter' }>): Promise<GeneratedChapter>;
export async function generateNovelContent(request: GenerationRequest): Promise<NovelOutline | { characters: NovelCharacter[] } | GeneratedChapter> {
  if (!supabase) throw new Error('ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase');
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session?.access_token) throw new Error('กรุณาเข้าสู่ระบบใหม่ก่อนใช้ AI');

  const { data, error } = await supabase.functions.invoke('novel-ai', { body: request });
  if (error) throw new Error(await responseError(error));
  if (!isRecord(data)) {
    throw new Error('ผลลัพธ์จาก AI มีรูปแบบไม่ถูกต้อง กรุณาลองใหม่');
  }
  if (
    (request.action === 'outline' && isNovelOutline(data.result))
    || (request.action === 'characters' && isCharacterResult(data.result))
    || (request.action === 'chapter' && isGeneratedChapter(data.result))
  ) return data.result;
  throw new Error('ผลลัพธ์จาก AI มีรูปแบบไม่ถูกต้อง กรุณาลองใหม่');
}

export type { NovelContext, PreviousChapter };
>>>>>>> bdee6feef93e04f1ca58e5d2b422188b6f75ad01

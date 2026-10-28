import type { Json } from './database.types';
import { supabase } from './supabase';
import type { GeneratedChapter, NovelCharacter, NovelOutline } from './novelAi';
import type { Genre, NewNovelInput, Novel } from '../types';

const genres: Genre[] = ['โรแมนซ์', 'แฟนตาซี', 'สืบสวน', 'ดราม่า', 'ไซไฟ', 'วาย / ยูริ', 'อื่น ๆ'];

export interface NovelWorkspace {
  outline: NovelOutline | null;
  characters: NovelCharacter[];
  chapters: GeneratedChapter[];
}

function requireSupabase() {
  if (!supabase) throw new Error('ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase');
  return supabase;
}

function toNovel(row: {
  id: string;
  title: string;
  genre: string[];
  premise: string | null;
  target_chapters: number;
}, chaptersWritten = 0): Novel {
  const genre = genres.find((item) => item === row.genre[0]) ?? 'อื่น ๆ';
  return {
    id: row.id,
    title: row.title,
    genre,
    premise: row.premise ?? '',
    chaptersTarget: row.target_chapters,
    chaptersWritten,
    updatedAt: 'บันทึกในคลัง',
    status: chaptersWritten ? 'กำลังเขียน' : 'วางพล็อต',
    accent: 'pink',
  };
}

function parseStringArray(value: Json): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function parseNovelCharacter(row: {
  name: string;
  role: string;
  personality: string | null;
  goals: string | null;
  notes: string | null;
  relationships: Json;
}): NovelCharacter {
  let arc = '';
  if (row.notes) {
    try {
      const notes: unknown = JSON.parse(row.notes);
      if (typeof notes === 'object' && notes !== null && 'arc' in notes && typeof notes.arc === 'string') {
        arc = notes.arc;
      }
    } catch {
      arc = '';
    }
  }
  return {
    name: row.name,
    role: row.role,
    description: row.personality ?? '',
    motivation: row.goals ?? '',
    arc,
    relationships: parseStringArray(row.relationships),
  };
}

export async function listNovels(userId: string): Promise<Novel[]> {
  const client = requireSupabase();
  const { data: novelRows, error } = await client
    .from('novels')
    .select('id, title, genre, premise, target_chapters')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  if (!novelRows.length) return [];

  const novelIds = novelRows.map((novel) => novel.id);
  const { data: chapterRows, error: chaptersError } = await client
    .from('chapters')
    .select('novel_id')
    .in('novel_id', novelIds);
  if (chaptersError) throw chaptersError;

  const chaptersByNovel = new Map<string, number>();
  for (const chapter of chapterRows) {
    chaptersByNovel.set(chapter.novel_id, (chaptersByNovel.get(chapter.novel_id) ?? 0) + 1);
  }
  return novelRows.map((row) => toNovel(row, chaptersByNovel.get(row.id) ?? 0));
}

export async function createNovel(input: NewNovelInput, userId: string): Promise<Novel> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('novels')
    .insert({
      user_id: userId,
      title: input.title.trim(),
      genre: [input.genre],
      premise: input.premise.trim() || null,
      target_chapters: Math.min(100, Math.max(1, Number(input.chaptersTarget) || 30)),
    })
    .select('id, title, genre, premise, target_chapters')
    .single();
  if (error) throw error;
  return toNovel(data);
}

export async function updateNovel(id: string, patch: Partial<Novel>, userId: string): Promise<void> {
  const client = requireSupabase();
  const update: {
    title?: string;
    genre?: string[];
    premise?: string | null;
    target_chapters?: number;
    updated_at: string;
  } = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.genre !== undefined) update.genre = [patch.genre];
  if (patch.premise !== undefined) update.premise = patch.premise || null;
  if (patch.chaptersTarget !== undefined) update.target_chapters = patch.chaptersTarget;

  const { data, error } = await client.from('novels')
    .update(update)
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('ไม่พบนิยายที่แก้ไขได้ในบัญชีนี้');
}

export async function deleteNovel(id: string, userId: string): Promise<void> {
  const { data, error } = await requireSupabase().from('novels')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('ไม่พบนิยายที่ลบได้ในบัญชีนี้');
}

export async function loadNovelWorkspace(novelId: string): Promise<NovelWorkspace> {
  const client = requireSupabase();
  const [novelResult, outlineResult, characterResult, chapterResult] = await Promise.all([
    client.from('novels').select('synopsis').eq('id', novelId).single(),
    client.from('novel_outlines')
      .select('chapter_number, title, summary, key_events, cliffhanger, continuity_notes')
      .eq('novel_id', novelId)
      .order('chapter_number'),
    client.from('characters')
      .select('name, role, personality, goals, notes, relationships')
      .eq('novel_id', novelId)
      .order('created_at'),
    client.from('chapters')
      .select('chapter_number, title, content, summary')
      .eq('novel_id', novelId)
      .order('chapter_number'),
  ]);
  if (novelResult.error) throw novelResult.error;
  if (outlineResult.error) throw outlineResult.error;
  if (characterResult.error) throw characterResult.error;
  if (chapterResult.error) throw chapterResult.error;

  const outlineRows = outlineResult.data;
  const outlineByChapter = new Map(outlineRows.map((row) => [row.chapter_number, row]));
  const outline = outlineRows.length ? {
    logline: '',
    synopsis: novelResult.data.synopsis ?? '',
    themes: [],
    chapters: outlineRows.map((row) => ({
      number: row.chapter_number,
      title: row.title ?? `บทที่ ${row.chapter_number}`,
      summary: row.summary ?? '',
      keyEvents: parseStringArray(row.key_events),
      cliffhanger: row.cliffhanger ?? '',
    })),
    continuitySummary: outlineRows[outlineRows.length - 1].continuity_notes ?? '',
  } : null;

  return {
    outline,
    characters: characterResult.data.map(parseNovelCharacter),
    chapters: chapterResult.data.map((row) => ({
      chapterNumber: row.chapter_number,
      title: row.title,
      content: row.content,
      summary: row.summary ?? '',
      keyEvents: parseStringArray(outlineByChapter.get(row.chapter_number)?.key_events ?? []),
      continuityUpdates: [],
      unresolvedThreads: [],
    })),
  };
}

export async function saveNovelOutline(novelId: string, outline: NovelOutline): Promise<void> {
  const client = requireSupabase();
  const { data: novel, error: novelError } = await client.from('novels')
    .update({ synopsis: outline.synopsis, updated_at: new Date().toISOString() })
    .eq('id', novelId)
    .select('id')
    .maybeSingle();
  if (novelError) throw novelError;
  if (!novel) throw new Error('ไม่สามารถบันทึกเรื่องย่อของนิยายนี้ได้');

  const { data: existingRows, error: existingError } = await client
    .from('novel_outlines')
    .select('id, chapter_number')
    .eq('novel_id', novelId);
  if (existingError) throw existingError;
  const existingByNumber = new Map(existingRows.map((row) => [row.chapter_number, row.id]));

  const updates = outline.chapters
    .filter((chapter) => existingByNumber.has(chapter.number))
    .map((chapter) => {
      const id = existingByNumber.get(chapter.number);
      if (!id) throw new Error(`ไม่พบโครงเรื่องบทที่ ${chapter.number}`);
      return client.from('novel_outlines').update({
        title: chapter.title,
        summary: chapter.summary,
        key_events: chapter.keyEvents as Json,
        cliffhanger: chapter.cliffhanger,
        continuity_notes: outline.continuitySummary,
        updated_at: new Date().toISOString(),
      }).eq('id', id).select('id').maybeSingle();
    });
  const inserts = outline.chapters
    .filter((chapter) => !existingByNumber.has(chapter.number))
    .map((chapter) => ({
      novel_id: novelId,
      chapter_number: chapter.number,
      title: chapter.title,
      summary: chapter.summary,
      key_events: chapter.keyEvents as Json,
      cliffhanger: chapter.cliffhanger,
      continuity_notes: outline.continuitySummary,
    }));

  const updateResults = await Promise.all(updates);
  const failedUpdate = updateResults.find((result) => result.error || !result.data);
  if (failedUpdate?.error) throw failedUpdate.error;
  if (failedUpdate) throw new Error('โครงเรื่องบางบทไม่ได้รับการบันทึก');
  if (inserts.length) {
    const { error } = await client.from('novel_outlines').insert(inserts);
    if (error) throw error;
  }
}

export async function saveNovelCharacters(novelId: string, characters: NovelCharacter[]): Promise<void> {
  const client = requireSupabase();
  const { data: existingRows, error: existingError } = await client
    .from('characters')
    .select('id, name, notes')
    .eq('novel_id', novelId);
  if (existingError) throw existingError;
  const existingByName = new Map(existingRows.map((row) => [row.name, row.id]));
  const generatedNames = new Set(existingRows.filter((row) => {
    try {
      const notes: unknown = JSON.parse(row.notes ?? '');
      return typeof notes === 'object' && notes !== null && 'source' in notes && notes.source === 'novel-ai';
    } catch {
      return false;
    }
  }).map((row) => row.name));

  const updates = characters
    .filter((character) => generatedNames.has(character.name))
    .map((character) => {
      const id = existingByName.get(character.name);
      if (!id) throw new Error(`ไม่พบตัวละคร ${character.name}`);
      return client.from('characters').update({
        role: character.role,
        personality: character.description,
        goals: character.motivation,
        notes: JSON.stringify({ source: 'novel-ai', arc: character.arc }),
        relationships: character.relationships as Json,
        updated_at: new Date().toISOString(),
      }).eq('id', id).select('id').maybeSingle();
    });
  const inserts = characters
    .filter((character) => !existingByName.has(character.name))
    .map((character) => ({
      novel_id: novelId,
      name: character.name,
      role: character.role,
      personality: character.description,
      goals: character.motivation,
      notes: JSON.stringify({ source: 'novel-ai', arc: character.arc }),
      relationships: character.relationships as Json,
    }));

  const updateResults = await Promise.all(updates);
  const failedUpdate = updateResults.find((result) => result.error || !result.data);
  if (failedUpdate?.error) throw failedUpdate.error;
  if (failedUpdate) throw new Error('ตัวละครบางตัวไม่ได้รับการบันทึก');
  if (inserts.length) {
    const { error } = await client.from('characters').insert(inserts);
    if (error) throw error;
  }
}

export async function saveNovelChapter(novelId: string, chapter: GeneratedChapter): Promise<number> {
  const client = requireSupabase();
  const { data: existing, error: existingError } = await client
    .from('chapters')
    .select('chapter_number, title, content, summary')
    .eq('novel_id', novelId)
    .eq('chapter_number', chapter.chapterNumber)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing && (
    existing.title !== chapter.title
    || existing.content !== chapter.content
    || (existing.summary ?? '') !== chapter.summary
  )) {
    throw new Error(`บทที่ ${chapter.chapterNumber} มีอยู่แล้ว กรุณาโหลดนิยายใหม่ก่อนสร้างบทถัดไป`);
  }

  const { data: outlineRows, error: outlineError } = await client
    .from('novel_outlines')
    .select('id, chapter_number, title, summary, key_events, cliffhanger, continuity_notes')
    .eq('novel_id', novelId)
    .order('chapter_number');
  if (outlineError) throw outlineError;

  const chapterOutline = outlineRows.find((row) => row.chapter_number === chapter.chapterNumber);
  const latestOutline = outlineRows[outlineRows.length - 1];
  const continuityUpdate = [
    ...chapter.continuityUpdates,
    ...chapter.unresolvedThreads.map((thread) => `ปมที่ยังไม่คลี่คลาย: ${thread}`),
  ].join('\n');
  const continuityNotes = [latestOutline?.continuity_notes, continuityUpdate].filter(Boolean).join('\n');
  if (chapterOutline) {
    const { data: updatedChapterOutline, error: updateChapterOutlineError } = await client.from('novel_outlines')
      .update({
        key_events: chapter.keyEvents as Json,
        ...(chapterOutline.id === latestOutline?.id ? { continuity_notes: continuityNotes } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', chapterOutline.id)
      .select('id')
      .maybeSingle();
    if (updateChapterOutlineError) throw updateChapterOutlineError;
    if (!updatedChapterOutline) throw new Error('ไม่สามารถบันทึกเหตุการณ์ของบทได้');
  } else {
    const { error: insertOutlineError } = await client.from('novel_outlines').insert({
      novel_id: novelId,
      chapter_number: chapter.chapterNumber,
      title: chapter.title,
      summary: chapter.summary,
      cliffhanger: chapter.unresolvedThreads.join('\n'),
      key_events: chapter.keyEvents as Json,
      continuity_notes: continuityUpdate,
    });
    if (insertOutlineError) throw insertOutlineError;
  }
  if (latestOutline && latestOutline.id !== chapterOutline?.id) {
    const { data: updatedLatestOutline, error: updateLatestOutlineError } = await client.from('novel_outlines')
      .update({ continuity_notes: continuityNotes, updated_at: new Date().toISOString() })
      .eq('id', latestOutline.id)
      .select('id')
      .maybeSingle();
    if (updateLatestOutlineError) throw updateLatestOutlineError;
    if (!updatedLatestOutline) throw new Error('ไม่สามารถบันทึกสรุปความต่อเนื่องได้');
  }

  if (!existing) {
    const { error } = await client.from('chapters').insert({
      novel_id: novelId,
      chapter_number: chapter.chapterNumber,
      title: chapter.title,
      content: chapter.content,
      summary: chapter.summary,
      generated_at: new Date().toISOString(),
      generation_model: 'gpt-4.1-mini',
      word_count: chapter.content.trim().split(/\s+/).filter(Boolean).length,
    });
    if (error) throw error;
  }

  const { data: chapters, error: countError } = await client
    .from('chapters')
    .select('chapter_number')
    .eq('novel_id', novelId);
  if (countError) throw countError;
  return chapters.length;
}

export async function listNovelChapters(novelId: string): Promise<GeneratedChapter[]> {
  const client = requireSupabase();
  const [{ data, error }, { data: outlines, error: outlineError }] = await Promise.all([
    client
    .from('chapters')
    .select('chapter_number, title, content, summary')
    .eq('novel_id', novelId)
    .order('chapter_number'),
    client.from('novel_outlines')
      .select('chapter_number, key_events, continuity_notes')
      .eq('novel_id', novelId),
  ]);
  if (error) throw error;
  if (outlineError) throw outlineError;
  const outlineByChapter = new Map(outlines.map((outline) => [outline.chapter_number, outline]));
  return data.map((row) => ({
    chapterNumber: row.chapter_number,
    title: row.title,
    content: row.content,
    summary: row.summary ?? '',
    keyEvents: parseStringArray(outlineByChapter.get(row.chapter_number)?.key_events ?? []),
    continuityUpdates: [],
    unresolvedThreads: [],
  }));
}

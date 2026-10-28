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

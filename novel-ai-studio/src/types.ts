export type Genre =
  | 'โรแมนซ์'
  | 'แฟนตาซี'
  | 'สืบสวน'
  | 'ดราม่า'
  | 'ไซไฟ'
  | 'วาย / ยูริ'
  | 'อื่น ๆ'

export interface Novel {
  id: string
  title: string
  genre: Genre
  premise: string
  chaptersTarget: number
  chaptersWritten: number
  updatedAt: string
  status: 'กำลังเขียน' | 'วางพล็อต' | 'พักไว้'
  accent: 'pink' | 'purple' | 'peach' | 'blue'
}

export interface NewNovelInput {
  title: string
  genre: Genre
  premise: string
  chaptersTarget: number
}
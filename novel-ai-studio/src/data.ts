import type { Novel } from './types'

export const starterNovels: Novel[] = [
  {
    id: 'starter-1',
    title: 'จดหมายจากฤดูหนาว',
    genre: 'โรแมนซ์',
    premise: 'นักเขียนสาวได้รับจดหมายที่ถูกส่งมาจากอนาคต และเริ่มตามหาความจริงของคนที่เธอไม่เคยลืม',
    chaptersTarget: 30,
    chaptersWritten: 12,
    updatedAt: 'วันนี้',
    status: 'กำลังเขียน',
    accent: 'pink',
  },
  {
    id: 'starter-2',
    title: 'อาณาจักรใต้แสงจันทร์',
    genre: 'แฟนตาซี',
    premise: 'เด็กสาวผู้ได้ยินเสียงของดวงดาวต้องเลือกระหว่างคำทำนายกับเส้นทางที่เธอเลือกเอง',
    chaptersTarget: 30,
    chaptersWritten: 7,
    updatedAt: 'เมื่อวาน',
    status: 'วางพล็อต',
    accent: 'purple',
  },
  {
    id: 'starter-3',
    title: 'เงาที่ห้องหมายเลขเก้า',
    genre: 'สืบสวน',
    premise: 'นักศึกษาฝึกงานในหอพักเก่าพบเบาะแสที่เชื่อมคดีปริศนาหลายสิบปีก่อนเข้าด้วยกัน',
    chaptersTarget: 24,
    chaptersWritten: 18,
    updatedAt: '3 วันที่แล้ว',
    status: 'กำลังเขียน',
    accent: 'blue',
  },
]

export const accentClass: Record<Novel['accent'], string> = {
  pink: 'cover-pink',
  purple: 'cover-purple',
  peach: 'cover-peach',
  blue: 'cover-blue',
}
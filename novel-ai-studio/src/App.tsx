import { useEffect, useMemo, useState, type FormEvent } from 'react'
import LoginPage from './LoginPage';
import { supabase, supabaseConfigurationError } from './lib/supabase';
import { useAuth } from './lib/AuthContext';
import type { Session } from '@supabase/supabase-js';


import {
  BookOpen, BookPlus, Sparkles, Search, LayoutDashboard, LibraryBig,
  Settings2, CircleHelp, Bell, ChevronDown, Plus, MoreHorizontal,
  PenLine, Trash2, WandSparkles, Clock3, FileText, Heart, X, ArrowUpRight,
  CheckCircle2, SlidersHorizontal, Feather, Stars, PanelLeftClose,
  LoaderCircle, BookMarked, ChevronLeft, ChevronRight, CircleAlert,
} from 'lucide-react'
import { starterNovels } from './data'
import type { Genre, NewNovelInput, Novel, NovelChapter } from './types'
import { generateNovelChapter } from './lib/novelAi'

const STORAGE_KEY = 'novel-ai-studio:novels:v1'
const genres: Genre[] = ['โรแมนซ์', 'แฟนตาซี', 'สืบสวน', 'ดราม่า', 'ไซไฟ', 'วาย / ยูริ', 'อื่น ๆ']

function loadNovels(): Novel[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored) as Novel[]
  } catch {
    // If storage is unavailable or malformed, fall back to starter examples.
  }
  return starterNovels
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `novel-${Date.now()}`
}

function DashboardApp() {
  const { user: firebaseUser } = useAuth()
  const [novels, setNovels] = useState<Novel[]>(loadNovels)
  const [search, setSearch] = useState('')
  const [activeNav, setActiveNav] = useState('ภาพรวม')
  const [showCreate, setShowCreate] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null)
  const [generatingNovelId, setGeneratingNovelId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [noticeIsError, setNoticeIsError] = useState(false)
  const [form, setForm] = useState<NewNovelInput>({
    title: '', genre: 'โรแมนซ์', premise: '', chaptersTarget: 30,
  })

  function notify(message: string, isError = false) {
    setNoticeIsError(isError)
    setNotice(message)
  }

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(novels))
    } catch {
      notify('บันทึกในเบราว์เซอร์ไม่สำเร็จ กรุณาตรวจสอบพื้นที่จัดเก็บ', true)
    }
  }, [novels])

  useEffect(() => {
    const openLibrary = () => setActiveNav('คลังนิยาย')
    window.addEventListener('novel:navigate-library', openLibrary)
    return () => window.removeEventListener('novel:navigate-library', openLibrary)
  }, [])

  const filteredNovels = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    if (!term) return novels
    return novels.filter((novel) =>
      `${novel.title} ${novel.genre} ${novel.premise}`.toLocaleLowerCase().includes(term),
    )
  }, [novels, search])

  const totalChapters = novels.reduce((sum, novel) => sum + novel.chaptersTarget, 0)
  const writtenChapters = novels.reduce((sum, novel) => sum + novel.chaptersWritten, 0)
  const averageProgress = totalChapters ? Math.round((writtenChapters / totalChapters) * 100) : 0

  async function createNovel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = form.title.trim()
    if (!title) return
    const nextNovel: Novel = {
      id: makeId(),
      title,
      genre: form.genre,
      premise: form.premise.trim(),
      chaptersTarget: Math.min(100, Math.max(1, Number(form.chaptersTarget) || 30)),
      chaptersWritten: 0,
      chapters: [],
      updatedAt: 'เพิ่งสร้าง',
      status: 'วางพล็อต',
      accent: ['pink', 'purple', 'peach', 'blue'][novels.length % 4] as Novel['accent'],
    }
    setNovels((current) => [nextNovel, ...current])
    setForm({ title: '', genre: 'โรแมนซ์', premise: '', chaptersTarget: 30 })
    setShowCreate(false)
    setActiveNav('คลังนิยาย')
    setSelectedNovel(nextNovel)
    notify('สร้างโปรเจกต์แล้ว กำลังให้ AI เขียนบทแรก')
    await generateNextChapter(nextNovel)
  }

  async function generateNextChapter(novel: Novel) {
    const chapters = novel.chapters ?? []
    if (chapters.length >= novel.chaptersTarget) {
      notify('เขียนครบตามจำนวนบทเป้าหมายแล้ว')
      return
    }
    if (generatingNovelId) {
      notify('กำลังเขียนบทนิยายเรื่องอื่นอยู่ กรุณารอสักครู่')
      return
    }

    setGeneratingNovelId(novel.id)
    try {
      if (!supabase) {
        throw new Error(supabaseConfigurationError ?? 'ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase')
      }

      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      const accessToken = data.session?.access_token ?? await firebaseUser?.getIdToken()
      if (!accessToken) {
        throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง')
      }

      const generated = await generateNovelChapter({
        title: novel.title,
        genre: novel.genre,
        premise: novel.premise,
        chapterNumber: chapters.length + 1,
        previousChapter: chapters.length
          ? { title: chapters[chapters.length - 1].title, content: chapters[chapters.length - 1].content }
          : null,
      }, accessToken)
      const newChapter: NovelChapter = {
        number: chapters.length + 1,
        title: generated.title,
        content: generated.content,
        createdAt: new Date().toISOString(),
      }
      const updatedNovel: Novel = {
        ...novel,
        chapters: [...chapters, newChapter],
        chaptersWritten: chapters.length + 1,
        status: 'กำลังเขียน',
        updatedAt: 'เพิ่งเขียน',
      }

      setNovels((current) => current.map((item) => item.id === novel.id ? updatedNovel : item))
      setSelectedNovel((current) => current?.id === novel.id ? updatedNovel : current)
      notify(`AI เขียนบทที่ ${newChapter.number} เสร็จแล้ว`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'AI เขียนบทไม่สำเร็จ กรุณาลองอีกครั้ง', true)
    } finally {
      setGeneratingNovelId(null)
    }
  }

  function deleteNovel(id: string) {
    const target = novels.find((novel) => novel.id === id)
    if (!target || !window.confirm(`ต้องการลบโปรเจกต์ “${target.title}” หรือไม่?`)) return
    setNovels((current) => current.filter((novel) => novel.id !== id))
    setSelectedNovel(null)
    notify('ลบโปรเจกต์แล้ว')
  }

  function updateNovel(id: string, patch: Partial<Novel>) {
    setNovels((current) => current.map((novel) => novel.id === id ? { ...novel, ...patch, updatedAt: 'แก้ไขล่าสุด' } : novel))
    setSelectedNovel((current) => current?.id === id ? { ...current, ...patch, updatedAt: 'แก้ไขล่าสุด' } : current)
    notify('บันทึกการแก้ไขแล้ว')
  }

  function navTo(label: string) {
    setActiveNav(label)
    if (label === 'ตั้งค่า') setShowSettings(true)
    if (label === 'สร้างนิยายด้วย AI') setShowCreate(true)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><BookOpen size={23} strokeWidth={2.2} /></div>
          <div><div className="brand-name">Novel AI <span>Studio</span></div><div className="brand-caption">YOUR STORY, REIMAGINED</div></div>
          <button className="icon-button sidebar-collapse" aria-label="ย่อแถบเมนู"><PanelLeftClose size={18} /></button>
        </div>

        <button className="workspace-switch">
          <div className="workspace-avatar">N</div>
          <div className="workspace-copy"><strong>My Writing Space</strong><span>พื้นที่เขียนส่วนตัว</span></div>
          <ChevronDown size={16} className="muted-icon" />
        </button>

        <div className="side-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="เมนูหลัก">
          <NavButton icon={<LayoutDashboard size={18} />} label="ภาพรวม" active={activeNav === 'ภาพรวม'} onClick={() => navTo('ภาพรวม')} />
          <NavButton icon={<LibraryBig size={18} />} label="คลังนิยาย" active={activeNav === 'คลังนิยาย'} onClick={() => navTo('คลังนิยาย')} count={novels.length} />
          <NavButton icon={<WandSparkles size={18} />} label="สร้างนิยายด้วย AI" active={activeNav === 'สร้างนิยายด้วย AI'} onClick={() => navTo('สร้างนิยายด้วย AI')} />
          <NavButton icon={<FileText size={18} />} label="พล็อตและตัวละคร" active={activeNav === 'พล็อตและตัวละคร'} onClick={() => { navTo('พล็อตและตัวละคร'); notify('ส่วนพล็อตและตัวละครจะเชื่อมกับ Story Bible ในขั้นถัดไป') }} />
        </nav>

        <div className="side-label side-label-spaced">PERSONAL</div>
        <nav className="side-nav">
          <NavButton icon={<Settings2 size={18} />} label="ตั้งค่า" active={activeNav === 'ตั้งค่า'} onClick={() => navTo('ตั้งค่า')} />
          <NavButton icon={<CircleHelp size={18} />} label="คู่มือการใช้งาน" active={false} onClick={() => notify('เริ่มจาก “สร้างนิยายใหม่” แล้วกรอกชื่อ แนวเรื่อง และไอเดียหลัก')} />
        </nav>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-spark"><Sparkles size={17} /></div>
            <strong>เรื่องราวของคุณ<br />เริ่มต้นได้ที่นี่</strong>
            <p>เปลี่ยนไอเดียเล็ก ๆ ให้เป็นโลกนิยายใบใหม่</p>
            <button onClick={() => setShowCreate(true)}>สร้างนิยายใหม่ <ArrowUpRight size={15} /></button>
            <div className="upgrade-orb orb-one" /><div className="upgrade-orb orb-two" />
          </div>
          <div className="profile-row">
            <div className="profile-avatar">J</div>
            <div className="profile-copy"><strong>นักเขียนของฉัน</strong><span>บัญชีส่วนตัว · Demo</span></div>
            <MoreHorizontal size={19} className="muted-icon" />
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{activeNav}</strong></div>
          <div className="top-actions">
            <div className="local-badge"><span /> บันทึกในเครื่อง</div>
            <button className="icon-button notification-button" aria-label="การแจ้งเตือน" onClick={() => notify('ยังไม่มีการแจ้งเตือนใหม่')}><Bell size={18} /><i /></button>
            <div className="top-avatar">J</div>
          </div>
        </header>

        <div className="page-content">
          {activeNav === 'คลังนิยาย' ? (
            <LibraryPage novels={filteredNovels} search={search} setSearch={setSearch} onCreate={() => setShowCreate(true)} onOpen={setSelectedNovel} onDelete={deleteNovel} />
          ) : activeNav === 'พล็อตและตัวละคร' ? (
            <ComingSoon title="พล็อตและตัวละคร" description="พื้นที่สำหรับ Story Bible, เส้นเรื่องหลัก และรายละเอียดตัวละคร จะเชื่อมกับฐานข้อมูลในขั้นถัดไป" onBack={() => setActiveNav('ภาพรวม')} />
          ) : (
            <Dashboard
              novels={filteredNovels}
              search={search}
              setSearch={setSearch}
              onCreate={() => setShowCreate(true)}
              onOpen={setSelectedNovel}
              onDelete={deleteNovel}
              totalNovels={novels.length}
              writtenChapters={writtenChapters}
              totalChapters={totalChapters}
              averageProgress={averageProgress}
              onStartAI={() => setShowCreate(true)}
            />
          )}
          <footer className="page-footer"><span>© 2026 Novel AI Studio</span><span>Made for stories that matter <Heart size={13} fill="currentColor" /></span></footer>
        </div>
      </main>

      {showCreate && <CreateNovelModal form={form} setForm={setForm} onClose={() => setShowCreate(false)} onSubmit={createNovel} />}
      {selectedNovel && <NovelDetailModal novel={selectedNovel} onClose={() => setSelectedNovel(null)} onDelete={() => deleteNovel(selectedNovel.id)} onUpdate={(patch) => updateNovel(selectedNovel.id, patch)} onGenerateChapter={generateNextChapter} isGenerating={generatingNovelId === selectedNovel.id} isBusy={generatingNovelId !== null} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onReset={() => { if (window.confirm('ต้องการคืนค่าข้อมูลตัวอย่างหรือไม่? ข้อมูลที่สร้างไว้ในเครื่องนี้จะถูกแทนที่')) { setNovels(starterNovels); setShowSettings(false); notify('คืนค่าข้อมูลตัวอย่างแล้ว') } }} />}
      {notice && <div className={`toast ${noticeIsError ? 'toast-error' : ''}`} role={noticeIsError ? 'alert' : 'status'}>{noticeIsError ? <CircleAlert size={18} /> : <CheckCircle2 size={18} />}<span>{notice}</span><button aria-label="ปิดข้อความ" onClick={() => setNotice('')}><X size={16} /></button></div>}
    </div>
  )
}

function NavButton({ icon, label, active, onClick, count }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; count?: number }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{count !== undefined && <small>{count}</small>}</button>
}

function Dashboard({ novels, search, setSearch, onCreate, onOpen, onDelete, totalNovels, writtenChapters, totalChapters, averageProgress, onStartAI }: {
  novels: Novel[]; search: string; setSearch: (value: string) => void; onCreate: () => void; onOpen: (novel: Novel) => void; onDelete: (id: string) => void; totalNovels: number; writtenChapters: number; totalChapters: number; averageProgress: number; onStartAI: () => void
}) {
  return <>
    <section className="welcome-row">
      <div><div className="eyebrow"><Stars size={14} /> YOUR CREATIVE SPACE</div><h1>ทุกเรื่องราวที่ดี<br className="mobile-break" /> เริ่มจาก <span>จินตนาการ</span></h1><p className="welcome-subtitle">วันนี้อยากพาเรื่องราวของคุณไปถึงไหนแล้ว?</p></div>
      <button className="primary-button" onClick={onCreate}><Plus size={18} /> สร้างนิยายใหม่</button>
    </section>

    <section className="hero-banner">
      <div className="hero-copy"><div className="hero-kicker"><Sparkles size={15} /> AI STORY GENERATOR</div><h2>จากไอเดียในหัว<br />สู่โลกนิยายทั้งเล่ม</h2><p>ให้ AI ช่วยวางพล็อต สร้างตัวละคร และวางแผนเรื่องราว<br className="desktop-break" /> ตั้งแต่บทแรกไปจนถึงตอนจบ ในสไตล์ของคุณ</p><button className="hero-button" onClick={onStartAI}>เริ่มวางพล็อตด้วย AI <ArrowUpRight size={16} /></button><div className="hero-footnote"><span><CheckCircle2 size={14} /> วางแผนเป็นขั้นตอน</span><span><CheckCircle2 size={14} /> รักษาความต่อเนื่อง</span></div></div>
      <div className="hero-art" aria-hidden="true"><div className="art-spark spark-a">✦</div><div className="art-spark spark-b">✧</div><div className="art-orbit orbit-a" /><div className="art-orbit orbit-b" /><div className="art-book book-back" /><div className="art-book book-mid" /><div className="art-book book-front"><div className="book-flower">✿</div><div className="book-title">your<br />story</div><div className="book-line" /><div className="book-caption">A NOVEL IN BLOOM</div></div><div className="art-leaf leaf-a">❧</div><div className="art-leaf leaf-b">❦</div><div className="art-dot dot-a" /><div className="art-dot dot-b" /></div>
    </section>

    <section className="stats-grid">
      <StatCard icon={<BookOpen size={18} />} label="โปรเจกต์นิยาย" value={String(totalNovels)} note="เรื่องในคลังของคุณ" tint="pink" />
      <StatCard icon={<PenLine size={18} />} label="บทที่เขียนแล้ว" value={String(writtenChapters)} note={`จากเป้าหมาย ${totalChapters} บท`} tint="purple" />
      <StatCard icon={<Sparkles size={18} />} label="ความคืบหน้าเฉลี่ย" value={`${averageProgress}%`} note="คำนวณจากจำนวนบท" tint="peach" />
      <StatCard icon={<Clock3 size={18} />} label="โหมดการทำงาน" value="ส่วนตัว" note="ข้อมูลอยู่ในเบราว์เซอร์นี้" tint="blue" />
    </section>

    <section className="section-heading"><div><div className="section-eyebrow">KEEP THE MAGIC GOING</div><h2>นิยายของคุณ <span className="heading-count">{totalNovels}</span></h2><p>กลับไปเขียนต่อ หรือเริ่มต้นเรื่องใหม่ได้ทุกเมื่อ</p></div><button className="text-button" onClick={onCreate}>ดูไอเดียใหม่ <ArrowUpRight size={15} /></button></section>
    <NovelGrid novels={novels.slice(0, 3)} onOpen={onOpen} onDelete={onDelete} />
    <div className="library-tools"><div className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาชื่อเรื่อง แนวนิยาย..." aria-label="ค้นหานิยาย" />{search && <button onClick={() => setSearch('')} aria-label="ล้างคำค้น"><X size={15} /></button>}</div><button className="filter-button" onClick={() => setSearch('')}><SlidersHorizontal size={16} /> ล้างตัวกรอง</button><button className="view-all-button" onClick={() => window.dispatchEvent(new CustomEvent('novel:navigate-library'))}>ดูคลังทั้งหมด <ArrowUpRight size={15} /></button></div>
    <div className="tip-card"><div className="tip-icon"><Feather size={18} /></div><div><strong>เคล็ดลับสำหรับนักเขียน</strong><p>เขียนไอเดียหลักให้ชัดก่อนเริ่มวางพล็อต ยิ่งรู้ว่าใครต้องการอะไร เรื่องราวก็ยิ่งมีทิศทาง</p></div><span className="tip-spark">✧</span></div>
  </>
}

function StatCard({ icon, label, value, note, tint }: { icon: React.ReactNode; label: string; value: string; note: string; tint: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tint}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>
}

function NovelGrid({ novels, onOpen, onDelete }: { novels: Novel[]; onOpen: (novel: Novel) => void; onDelete: (id: string) => void }) {
  if (!novels.length) return <div className="empty-state"><BookOpen size={28} /><strong>ยังไม่พบนิยาย</strong><p>ลองเปลี่ยนคำค้นหา หรือสร้างโปรเจกต์ใหม่</p></div>
  return <div className="novel-grid">{novels.map((novel) => <NovelCard key={novel.id} novel={novel} onOpen={() => onOpen(novel)} onDelete={() => onDelete(novel.id)} />)}</div>
}

function NovelCard({ novel, onOpen, onDelete }: { novel: Novel; onOpen: () => void; onDelete: () => void }) {
  const progress = Math.min(100, Math.round((novel.chaptersWritten / novel.chaptersTarget) * 100))
  return <article className="novel-card">
    <button className={`novel-cover ${novel.accent}`} onClick={onOpen} aria-label={`เปิด ${novel.title}`}><div className="cover-stars">✦　·　✧</div><div className="cover-emblem">{novel.accent === 'pink' ? '❀' : novel.accent === 'purple' ? '☾' : novel.accent === 'blue' ? '✧' : '❋'}</div><div className="cover-title">{novel.title}</div><div className="cover-bottom">A STORY BY YOU</div><div className="cover-orb" /></button>
    <div className="novel-card-body"><div className="novel-card-top"><span className="genre-pill">{novel.genre}</span><button className="more-button" aria-label={`ลบ ${novel.title}`} onClick={onDelete}><MoreHorizontal size={19} /></button></div><button className="novel-title-button" onClick={onOpen}>{novel.title}</button><p className="novel-premise">{novel.premise || 'ยังไม่ได้เพิ่มคำโปรยของเรื่องนี้'}</p><div className="progress-row"><span>ความคืบหน้า</span><strong>{progress}%</strong></div><div className="progress-track"><div style={{ width: `${progress}%` }} /></div><div className="novel-card-footer"><span><FileText size={14} /> {novel.chaptersWritten}/{novel.chaptersTarget} บท</span><span><Clock3 size={13} /> {novel.updatedAt}</span></div></div>
  </article>
}

function LibraryPage({ novels, search, setSearch, onCreate, onOpen, onDelete }: { novels: Novel[]; search: string; setSearch: (value: string) => void; onCreate: () => void; onOpen: (novel: Novel) => void; onDelete: (id: string) => void }) {
  return <><section className="welcome-row library-welcome"><div><div className="eyebrow"><LibraryBig size={14} /> YOUR COLLECTION</div><h1>คลัง<span>นิยาย</span></h1><p className="welcome-subtitle">ทุกโปรเจกต์และไอเดียของคุณอยู่ที่นี่</p></div><button className="primary-button" onClick={onCreate}><Plus size={18} /> สร้างนิยายใหม่</button></section><div className="library-toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหานิยาย..." aria-label="ค้นหานิยาย" /></div><span className="result-count">{novels.length} โปรเจกต์</span></div><NovelGrid novels={novels} onOpen={onOpen} onDelete={onDelete} /></>
}

function CreateNovelModal({ form, setForm, onClose, onSubmit }: { form: NewNovelInput; setForm: (form: NewNovelInput) => void; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <Modal onClose={onClose} wide><div className="modal-heading"><div className="modal-icon"><BookPlus size={21} /></div><div><div className="section-eyebrow">A NEW STORY BEGINS</div><h2>สร้างนิยายเรื่องใหม่</h2><p>เริ่มจากไอเดีย แล้วค่อย ๆ สร้างโลกของคุณ</p></div><button className="modal-close" onClick={onClose} aria-label="ปิด"><X size={19} /></button></div><form className="novel-form" onSubmit={onSubmit}>
    <label>ชื่อเรื่อง <span>*</span><input autoFocus required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="เช่น ถ้าชาติหน้ามีจริง ขอให้เราได้รักกัน" /></label>
    <label>แนวนิยาย<select value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value as Genre })}>{genres.map((genre) => <option key={genre}>{genre}</option>)}</select></label>
    <label>ไอเดียหลัก / เรื่องย่อ<textarea rows={4} maxLength={3000} value={form.premise} onChange={(e) => setForm({ ...form, premise: e.target.value })} placeholder="เล่าให้ฟังว่าเรื่องนี้เกี่ยวกับใคร ตัวละครต้องการอะไร และมีอุปสรรคอะไร..." /><small>เขียนเท่าที่มีได้ คุณกลับมาแก้ไขภายหลังได้</small></label>
    <label>จำนวนบทเป้าหมาย<input type="number" min={1} max={100} value={form.chaptersTarget} onChange={(e) => setForm({ ...form, chaptersTarget: Number(e.target.value) })} /><small>ตั้งต้นไว้ที่ 30 บท สามารถปรับได้ระหว่างพัฒนา</small></label>
    <div className="form-note"><Sparkles size={16} /><span>เมื่อกดสร้าง ระบบจะบันทึกโปรเจกต์และให้ AI เขียนบทแรกให้ทันที บทที่เขียนแล้วจะเปิดอ่านและบันทึกไว้ในเบราว์เซอร์นี้</span></div>
    <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>ยกเลิก</button><button type="submit" className="primary-button"><WandSparkles size={17} /> สร้างนิยายและเขียนบทแรก</button></div>
  </form></Modal>
}

function NovelDetailModal({ novel, onClose, onDelete, onUpdate, onGenerateChapter, isGenerating, isBusy }: { novel: Novel; onClose: () => void; onDelete: () => void; onUpdate: (patch: Partial<Novel>) => void; onGenerateChapter: (novel: Novel) => Promise<void>; isGenerating: boolean; isBusy: boolean }) {
  const [title, setTitle] = useState(novel.title)
  const [premise, setPremise] = useState(novel.premise)
  const [genre, setGenre] = useState<Genre>(novel.genre)
  const [target, setTarget] = useState(novel.chaptersTarget)
  const [chapters, setChapters] = useState(novel.chaptersWritten)
  const [readingChapter, setReadingChapter] = useState<number | null>(null)
  const novelChapters = novel.chapters ?? []
  const activeChapter = novelChapters.find((chapter) => chapter.number === readingChapter)
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onUpdate({ title: title.trim() || novel.title, premise: premise.trim(), genre, chaptersTarget: Math.min(100, Math.max(1, target)), chaptersWritten: Math.min(Math.max(chapters, novelChapters.length), Math.max(1, target)) })
    onClose()
  }
  return <Modal onClose={onClose} wide><div className="modal-heading"><div className={`detail-cover-mini ${novel.accent}`}>✦</div><div><div className="section-eyebrow">NOVEL WORKSPACE</div><h2>รายละเอียดนิยาย</h2><p>แก้ไขข้อมูลโปรเจกต์ของคุณ</p></div><button className="modal-close" onClick={onClose} aria-label="ปิด"><X size={19} /></button></div><form className="novel-form" onSubmit={save}>
    <label>ชื่อเรื่อง<input required value={title} onChange={(e) => setTitle(e.target.value)} /></label>
    <label>แนวนิยาย<select value={genre} onChange={(e) => setGenre(e.target.value as Genre)}>{genres.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label>เรื่องย่อ<textarea rows={4} value={premise} onChange={(e) => setPremise(e.target.value)} /></label>
    <div className="form-two-columns"><label>บทเป้าหมาย<input type="number" min={1} max={100} value={target} onChange={(e) => setTarget(Number(e.target.value))} /></label><label>บทที่เขียนแล้ว<input type="number" min={0} max={100} value={chapters} onChange={(e) => setChapters(Number(e.target.value))} /></label></div>
    <section className="chapter-library" aria-label="บทนิยาย">
      <div className="chapter-library-heading">
        <div><div className="section-eyebrow">YOUR STORY, CHAPTER BY CHAPTER</div><h3>บทนิยาย <span>{novelChapters.length}/{novel.chaptersTarget}</span></h3></div>
        <button type="button" className="primary-button chapter-generate-button" disabled={isBusy || novelChapters.length >= novel.chaptersTarget} onClick={() => void onGenerateChapter(novel)}>
          {isGenerating ? <LoaderCircle className="spin" size={16} /> : <WandSparkles size={16} />}
          {isGenerating ? 'กำลังเขียน...' : isBusy ? 'AI กำลังเขียนเรื่องอื่น' : novelChapters.length ? 'เขียนบทถัดไป' : 'เขียนบทแรก'}
        </button>
      </div>
      {activeChapter ? (
        <article className="chapter-reader">
          <button type="button" className="chapter-back-button" onClick={() => setReadingChapter(null)}><ChevronLeft size={15} /> กลับไปยังรายการบท</button>
          <div className="reader-page">
            <div className="reader-eyebrow">บทที่ {activeChapter.number}</div>
            <h4>{activeChapter.title}</h4>
            <div className="reader-text">{activeChapter.content}</div>
          </div>
          <div className="reader-pagination">
            <button type="button" disabled={!novelChapters.some((chapter) => chapter.number === activeChapter.number - 1)} onClick={() => setReadingChapter(activeChapter.number - 1)}><ChevronLeft size={15} /> บทก่อนหน้า</button>
            <button type="button" disabled={!novelChapters.some((chapter) => chapter.number === activeChapter.number + 1)} onClick={() => setReadingChapter(activeChapter.number + 1)}>บทถัดไป <ChevronRight size={15} /></button>
          </div>
        </article>
      ) : novelChapters.length ? (
        <div className="chapter-list">{novelChapters.map((chapter) => (
          <button type="button" className="chapter-list-item" key={chapter.number} onClick={() => setReadingChapter(chapter.number)}>
            <span className="chapter-list-number">{String(chapter.number).padStart(2, '0')}</span>
            <span className="chapter-list-title"><strong>บทที่ {chapter.number}: {chapter.title}</strong><small>{new Date(chapter.createdAt).toLocaleDateString('th-TH')}</small></span>
            <BookMarked size={16} />
          </button>
        ))}</div>
      ) : (
        <div className="chapter-empty"><BookOpen size={22} /><span>ยังไม่มีบทนิยาย กด “เขียนบทแรก” เพื่อให้ AI เริ่มเขียนได้เลย</span></div>
      )}
    </section>
    <div className="form-note"><BookOpen size={16} /><span>ข้อมูลนี้เก็บใน localStorage ของเบราว์เซอร์ที่ใช้งานอยู่</span></div>
    <div className="modal-actions spread"><button type="button" className="danger-button" onClick={onDelete}><Trash2 size={16} /> ลบโปรเจกต์</button><div><button type="button" className="secondary-button" onClick={onClose}>ยกเลิก</button><button type="submit" className="primary-button"><CheckCircle2 size={16} /> บันทึก</button></div></div>
  </form></Modal>
}

function SettingsModal({ onClose, onReset }: { onClose: () => void; onReset: () => void }) {
  return <Modal onClose={onClose}><div className="modal-heading"><div className="modal-icon"><Settings2 size={21} /></div><div><div className="section-eyebrow">PREFERENCES</div><h2>ตั้งค่า</h2><p>การตั้งค่าของต้นแบบปัจจุบัน</p></div><button className="modal-close" onClick={onClose} aria-label="ปิด"><X size={19} /></button></div><div className="settings-content"><div className="setting-row"><div><strong>การจัดเก็บข้อมูล</strong><p>บันทึกใน localStorage ของเบราว์เซอร์</p></div><span className="setting-tag">Local</span></div><div className="setting-row"><div><strong>AI Generation</strong><p>ยังไม่ได้เชื่อมต่อ API</p></div><span className="setting-tag pending">รอตั้งค่า</span></div><div className="setting-row"><div><strong>บัญชีผู้ใช้</strong><p>ยังไม่มีระบบสมัครสมาชิก</p></div><span className="setting-tag pending">Demo</span></div><button className="secondary-button full-button" onClick={onReset}>คืนค่าข้อมูลตัวอย่าง</button></div></Modal>
}

function ComingSoon({ title, description, onBack }: { title: string; description: string; onBack: () => void }) {
  return <div className="coming-soon"><div className="coming-icon"><WandSparkles size={27} /></div><div className="section-eyebrow">IN DEVELOPMENT</div><h1>{title}</h1><p>{description}</p><button className="primary-button" onClick={onBack}>กลับหน้าภาพรวม</button></div>
}

function Modal({ children, onClose, wide = false }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className={`modal-panel ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true">{children}</section></div>
}

function App() {
  const { user: firebaseUser, loading: checkingFirebaseAuth } = useAuth()
  const [session, setSession] = useState<Session | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const client = supabase

    if (!client) {
      setCheckingSession(false)
      return
    }

    const auth = client.auth
    let active = true

    async function loadSession() {
      try {
        const { data, error } = await auth.getSession()
        if (error) throw error
        if (!active) return

        setSession(data.session)
        setCheckingSession(false)
      } catch (error) {
        console.error('ตรวจสอบสถานะเข้าสู่ระบบไม่สำเร็จ:', error)
        if (active) {
          setSession(null)
          setCheckingSession(false)
        }
      }
    }

    void loadSession()

    const {
      data: { subscription },
    } = auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setCheckingSession(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  if (checkingSession || checkingFirebaseAuth) {
    return <div style={{ padding: 32 }}>กำลังตรวจสอบบัญชี...</div>
  }

  if (!session && !firebaseUser) {
    return <LoginPage supabaseConfigurationError={supabaseConfigurationError} />
  }

  return <DashboardApp />
}


export default App

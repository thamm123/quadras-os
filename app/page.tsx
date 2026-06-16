'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const PERSONEN = ['Norman', 'Alexander', 'Anna'] as const
type Person = typeof PERSONEN[number]

const PROJEKTE = [
  'Cap', 'Patch / Frame', 'Crossbody Bag', 'T-Shirt',
  'Packaging', 'Website / Shop', 'Content / Social Media',
  'Lieferanten', 'Finanzen', 'Rechtliches', 'Organisation'
] as const

const PRIORITAETEN = ['Hoch', 'Normal', 'Niedrig'] as const
const STATUS_LIST = ['Offen', 'In Arbeit', 'Erledigt'] as const

type Aufgabe = {
  id: string; titel: string; beschreibung: string; person: string; projekt: string
  prioritaet: string; status: string; deadline: string | null; ergebnis: string; created_at: string
}
type Entscheidung = {
  id: string; titel: string; begruendung: string; person: string
  projekt: string; datum: string; created_at: string
}
type Datei = {
  id: string; name: string; dateiname: string; projekt: string
  hochgeladen_von: string; url: string; groesse: number; created_at: string
}

const today = () => new Date().toISOString().split('T')[0]
const fmtDate = (d: string | null) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
const isOverdue = (d: string | null, status: string) => d && d < today() && status !== 'Erledigt'

const PRIO_COLOR: Record<string, string> = { 'Hoch': '#ff3b30', 'Normal': '#007aff', 'Niedrig': '#8e8e93' }
const PERSON_COLOR: Record<string, string> = { 'Norman': '#5856d6', 'Alexander': '#007aff', 'Anna': '#ff2d55' }

const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
:root {
  --bg: #f2f2f7; --surface: #ffffff; --border: rgba(0,0,0,0.08);
  --text: #1c1c1e; --text2: #6d6d72; --text3: #aeaeb2;
  --accent: #007aff; --red: #ff3b30; --green: #34c759; --orange: #ff9500;
  --radius: 14px; --radius-sm: 10px;
  --shadow: 0 2px 12px rgba(0,0,0,0.06); --shadow-lg: 0 8px 32px rgba(0,0,0,0.12);
}
body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif; background: var(--bg); color: var(--text); font-size: 15px; line-height: 1.5; }
.app { display: flex; min-height: 100vh; }
.sidebar { width: 256px; background: rgba(255,255,255,0.9); backdrop-filter: blur(20px); border-right: 1px solid var(--border); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 100; }
.sidebar-top { padding: 28px 20px 16px; }
.logo { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
.logo-sub { font-size: 11px; color: var(--text3); margin-top: 2px; letter-spacing: 0.02em; }
.person-block { padding: 12px 16px; margin: 4px 8px 8px; background: var(--bg); border-radius: 12px; }
.person-label { font-size: 10px; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
.person-btns { display: flex; gap: 6px; }
.pbtn { flex: 1; padding: 7px 4px; border-radius: 8px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; background: white; color: var(--text2); }
.pbtn.active { color: white; }
.nav { padding: 4px 10px; flex: 1; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; cursor: pointer; transition: all 0.12s; color: var(--text2); font-size: 14px; font-weight: 500; margin-bottom: 1px; }
.nav-item:hover { background: var(--bg); color: var(--text); }
.nav-item.active { background: var(--accent); color: white; }
.nav-icon { font-size: 17px; width: 22px; text-align: center; }
.sidebar-footer { padding: 14px 18px; border-top: 1px solid var(--border); display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
.stat { text-align: center; padding: 8px 4px; border-radius: 8px; }
.stat-num { font-size: 22px; font-weight: 700; line-height: 1; letter-spacing: -0.5px; }
.stat-label { font-size: 10px; color: var(--text3); margin-top: 2px; }
.main { margin-left: 256px; flex: 1; padding: 36px 36px 60px; }
.page-title { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 4px; }
.page-sub { font-size: 14px; color: var(--text2); margin-bottom: 24px; }
.card { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; margin-bottom: 16px; }
.card-header { padding: 14px 16px 0; display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.card-title { font-size: 11px; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: 0.06em; }
.aufgabe { display: flex; align-items: flex-start; gap: 12px; padding: 13px 16px; border-bottom: 1px solid var(--border); transition: background 0.1s; }
.aufgabe:last-child { border-bottom: none; }
.aufgabe:hover { background: #fafafa; }
.aufgabe:hover .a-actions { opacity: 1; }
.aufgabe.done { opacity: 0.4; }
.check-btn { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--border); flex-shrink: 0; margin-top: 1px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; background: none; }
.check-btn:hover { border-color: var(--accent); }
.check-btn.arbeit { border-color: var(--orange); }
.check-btn.done { border-color: var(--green); background: var(--green); color: white; font-size: 11px; font-weight: 700; }
.a-body { flex: 1; min-width: 0; }
.a-titel { font-size: 14px; font-weight: 500; margin-bottom: 5px; }
.a-titel.overdue { color: var(--red); }
.a-desc { font-size: 13px; color: var(--text2); margin-bottom: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.a-meta { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.a-actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.15s; flex-shrink: 0; }
.tag { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.tag-proj { background: rgba(0,122,255,0.1); color: var(--accent); }
.tag-person { color: white; }
.tag-late { background: rgba(255,59,48,0.1); color: var(--red); }
.tag-ok { background: rgba(52,199,89,0.1); color: var(--green); }
.prio-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; font-family: inherit; }
.btn-p { background: var(--accent); color: white; }
.btn-p:hover { opacity: 0.88; }
.btn-g { background: var(--bg); color: var(--text); }
.btn-g:hover { background: #e5e5ea; }
.btn-d { background: rgba(255,59,48,0.08); color: var(--red); }
.btn-d:hover { background: rgba(255,59,48,0.15); }
.btn-sm { padding: 5px 12px; font-size: 13px; border-radius: 8px; }
.ibtn { width: 28px; height: 28px; border-radius: 7px; border: none; background: transparent; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all 0.12s; color: var(--text3); }
.ibtn:hover { background: var(--bg); color: var(--text); }
.ibtn.del:hover { background: rgba(255,59,48,0.1); color: var(--red); }
.filter-bar { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.chip { padding: 5px 13px; border-radius: 20px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1.5px solid var(--border); background: var(--surface); color: var(--text2); transition: all 0.12s; }
.chip.on { background: var(--text); color: white; border-color: var(--text); }
.empty { padding: 52px 24px; text-align: center; }
.empty-ico { font-size: 44px; margin-bottom: 12px; }
.empty-t { font-size: 16px; font-weight: 600; color: var(--text2); margin-bottom: 4px; }
.empty-s { font-size: 13px; color: var(--text3); }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal { background: var(--surface); border-radius: 20px; width: 100%; max-width: 520px; box-shadow: var(--shadow-lg); max-height: 92vh; overflow-y: auto; }
.modal-h { padding: 22px 22px 0; display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.modal-title { font-size: 18px; font-weight: 700; }
.modal-x { width: 30px; height: 30px; border-radius: 50%; border: none; background: var(--bg); cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; color: var(--text2); }
.modal-b { padding: 0 22px 22px; }
.fg { margin-bottom: 14px; }
.fl { font-size: 12px; font-weight: 700; color: var(--text3); margin-bottom: 5px; display: block; text-transform: uppercase; letter-spacing: 0.04em; }
.fi { width: 100%; padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 10px; font-size: 14px; font-family: inherit; background: #fafafa; color: var(--text); outline: none; transition: border-color 0.15s; }
.fi:focus { border-color: var(--accent); background: white; }
textarea.fi { resize: vertical; min-height: 76px; }
select.fi { cursor: pointer; }
.fr { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.fa { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border); }
.heute-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 28px; }
.metric { background: var(--surface); border-radius: 14px; padding: 18px; box-shadow: var(--shadow); }
.metric-n { font-size: 36px; font-weight: 700; letter-spacing: -1.5px; line-height: 1; margin-bottom: 4px; }
.metric-l { font-size: 13px; color: var(--text2); }
.pb { height: 3px; background: var(--bg); border-radius: 2px; margin-top: 10px; overflow: hidden; }
.pbf { height: 100%; border-radius: 2px; background: var(--green); }
.team-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.datei-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border); }
.datei-row:last-child { border-bottom: none; }
.datei-ico { width: 42px; height: 42px; border-radius: 10px; background: rgba(0,122,255,0.08); display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
.datei-info { flex: 1; min-width: 0; }
.datei-name { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.datei-meta { font-size: 12px; color: var(--text3); margin-top: 2px; }
.upload-zone { border: 2px dashed var(--border); border-radius: 12px; padding: 36px; text-align: center; cursor: pointer; transition: all 0.15s; color: var(--text2); }
.upload-zone:hover { border-color: var(--accent); color: var(--accent); background: rgba(0,122,255,0.03); }
.ent-row { padding: 14px 16px; border-bottom: 1px solid var(--border); }
.ent-row:last-child { border-bottom: none; }
.ent-titel { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
.ent-why { font-size: 13px; color: var(--text2); margin-bottom: 8px; }
.ent-meta { display: flex; gap: 8px; align-items: center; }
.section-h { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px 8px; }
.section-t { font-size: 11px; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: 0.06em; }
`

export default function App() {
  const [aktiv, setAktiv] = useState<Person>('Norman')
  const [ansicht, setAnsicht] = useState<'heute' | 'aufgaben' | 'dateien' | 'entscheidungen'>('heute')
  const [aufgaben, setAufgaben] = useState<Aufgabe[]>([])
  const [entscheidungen, setEntscheidungen] = useState<Entscheidung[]>([])
  const [dateien, setDateien] = useState<Datei[]>([])
  const [modal, setModal] = useState<null | 'aufgabe' | 'entscheidung' | 'datei'>(null)
  const [editAufgabe, setEditAufgabe] = useState<Aufgabe | null>(null)
  const [fPerson, setFPerson] = useState('Alle')
  const [fProjekt, setFProjekt] = useState('Alle')
  const [fStatus, setFStatus] = useState('Offen')
  const [uploading, setUploading] = useState(false)

  const laden = useCallback(async () => {
    const [a, e, d] = await Promise.all([
      supabase.from('aufgaben').select('*').order('created_at', { ascending: false }),
      supabase.from('entscheidungen').select('*').order('datum', { ascending: false }),
      supabase.from('dateien').select('*').order('created_at', { ascending: false }),
    ])
    if (a.data) setAufgaben(a.data)
    if (e.data) setEntscheidungen(e.data)
    if (d.data) setDateien(d.data)
  }, [])

  useEffect(() => { laden() }, [laden])

  useEffect(() => {
    const ch = supabase.channel('rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aufgaben' }, laden)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entscheidungen' }, laden)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dateien' }, laden)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [laden])

  const toggleStatus = async (a: Aufgabe) => {
    const next = a.status === 'Offen' ? 'In Arbeit' : a.status === 'In Arbeit' ? 'Erledigt' : 'Offen'
    await supabase.from('aufgaben').update({ status: next }).eq('id', a.id)
    laden()
  }

  const delAufgabe = async (id: string) => {
    if (!confirm('Aufgabe löschen?')) return
    await supabase.from('aufgaben').delete().eq('id', id)
    laden()
  }

  const delEntscheidung = async (id: string) => {
    if (!confirm('Löschen?')) return
    await supabase.from('entscheidungen').delete().eq('id', id)
    laden()
  }

  const delDatei = async (d: Datei) => {
    if (!confirm('Datei löschen?')) return
    await supabase.storage.from('dateien').remove([d.dateiname])
    await supabase.from('dateien').delete().eq('id', d.id)
    laden()
  }

  const handleUpload = async (file: File, projekt: string, name: string) => {
    setUploading(true)
    const fname = `${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('dateien').upload(fname, file)
    if (error) { alert('Upload fehlgeschlagen. Bitte Storage in Supabase aktivieren.'); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('dateien').getPublicUrl(fname)
    await supabase.from('dateien').insert({ name: name || file.name, dateiname: fname, projekt, hochgeladen_von: aktiv, url: urlData.publicUrl, groesse: file.size })
    setUploading(false); setModal(null); laden()
  }

  const meineOffen = aufgaben.filter(a => a.person === aktiv && a.status !== 'Erledigt').length
  const offenGesamt = aufgaben.filter(a => a.status !== 'Erledigt').length
  const ueberfaellig = aufgaben.filter(a => isOverdue(a.deadline, a.status)).length

  const meineAufgaben = aufgaben.filter(a => a.person === aktiv && a.status !== 'Erledigt')
    .sort((a, b) => ({ 'Hoch': 0, 'Normal': 1, 'Niedrig': 2 }[a.prioritaet] ?? 1) - ({ 'Hoch': 0, 'Normal': 1, 'Niedrig': 2 }[b.prioritaet] ?? 1))

  const gefiltert = aufgaben.filter(a => {
    if (fPerson !== 'Alle' && a.person !== fPerson) return false
    if (fProjekt !== 'Alle' && a.projekt !== fProjekt) return false
    if (fStatus !== 'Alle' && a.status !== fStatus) return false
    return true
  })

  const fileIcon = (name: string) =>
    name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? '🖼️' :
    name.match(/\.pdf$/i) ? '📄' :
    name.match(/\.(doc|docx)$/i) ? '📝' :
    name.match(/\.(xls|xlsx)$/i) ? '📊' : '📁'

  function AItem({ a, editable }: { a: Aufgabe; editable?: boolean }) {
    const ov = isOverdue(a.deadline, a.status)
    return (
      <div className={`aufgabe ${a.status === 'Erledigt' ? 'done' : ''}`}>
        <button className={`check-btn ${a.status === 'In Arbeit' ? 'arbeit' : a.status === 'Erledigt' ? 'done' : ''}`} onClick={() => toggleStatus(a)}>
          {a.status === 'Erledigt' && '✓'}
          {a.status === 'In Arbeit' && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--orange)' }} />}
        </button>
        <div className="a-body">
          <div className={`a-titel ${ov ? 'overdue' : ''}`}>{a.titel}</div>
          {a.beschreibung && <div className="a-desc">{a.beschreibung}</div>}
          <div className="a-meta">
            <div className="prio-dot" style={{ background: PRIO_COLOR[a.prioritaet] }} />
            <span className="tag tag-proj">{a.projekt}</span>
            <span className="tag tag-person" style={{ background: PERSON_COLOR[a.person] || '#8e8e93' }}>{a.person}</span>
            {a.deadline && <span className={`tag ${ov ? 'tag-late' : 'tag-ok'}`}>{ov ? '⚠ ' : ''}bis {fmtDate(a.deadline)}</span>}
            {a.ergebnis && <span style={{ fontSize: 11, color: 'var(--text3)' }}>→ {a.ergebnis}</span>}
          </div>
        </div>
        {editable && (
          <div className="a-actions">
            <button className="ibtn" onClick={() => { setEditAufgabe(a); setModal('aufgabe') }}>✏️</button>
            <button className="ibtn del" onClick={() => delAufgabe(a.id)}>×</button>
          </div>
        )}
      </div>
    )
  }

  function AufgabeModal() {
    const [f, setF] = useState({
      titel: editAufgabe?.titel || '', beschreibung: editAufgabe?.beschreibung || '',
      person: editAufgabe?.person || aktiv, projekt: editAufgabe?.projekt || 'Cap',
      prioritaet: editAufgabe?.prioritaet || 'Normal', status: editAufgabe?.status || 'Offen',
      deadline: editAufgabe?.deadline || '', ergebnis: editAufgabe?.ergebnis || '',
    })
    const [saving, setSaving] = useState(false)
    const save = async () => {
      if (!f.titel.trim()) return alert('Bitte Titel eingeben')
      setSaving(true)
      const data = { ...f, deadline: f.deadline || null }
      if (editAufgabe?.id) await supabase.from('aufgaben').update(data).eq('id', editAufgabe.id)
      else await supabase.from('aufgaben').insert(data)
      setSaving(false); setModal(null); setEditAufgabe(null); laden()
    }
    return (
      <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
        <div className="modal">
          <div className="modal-h">
            <div className="modal-title">{editAufgabe ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</div>
            <button className="modal-x" onClick={() => setModal(null)}>×</button>
          </div>
          <div className="modal-b">
            <div className="fg"><label className="fl">Was muss getan werden? *</label>
              <input className="fi" placeholder="z.B. Cap Tech Pack an Nana senden" value={f.titel} onChange={e => setF(p => ({ ...p, titel: e.target.value }))} autoFocus /></div>
            <div className="fg"><label className="fl">Details</label>
              <textarea className="fi" placeholder="Mehr Kontext, Links, Hinweise..." value={f.beschreibung} onChange={e => setF(p => ({ ...p, beschreibung: e.target.value }))} /></div>
            <div className="fr">
              <div className="fg"><label className="fl">Verantwortlich *</label>
                <select className="fi" value={f.person} onChange={e => setF(p => ({ ...p, person: e.target.value }))}>
                  {PERSONEN.map(p => <option key={p}>{p}</option>)}</select></div>
              <div className="fg"><label className="fl">Priorität</label>
                <select className="fi" value={f.prioritaet} onChange={e => setF(p => ({ ...p, prioritaet: e.target.value }))}>
                  {PRIORITAETEN.map(p => <option key={p}>{p}</option>)}</select></div>
            </div>
            <div className="fr">
              <div className="fg"><label className="fl">Bereich</label>
                <select className="fi" value={f.projekt} onChange={e => setF(p => ({ ...p, projekt: e.target.value }))}>
                  {PROJEKTE.map(p => <option key={p}>{p}</option>)}</select></div>
              <div className="fg"><label className="fl">Deadline</label>
                <input type="date" className="fi" value={f.deadline} onChange={e => setF(p => ({ ...p, deadline: e.target.value }))} /></div>
            </div>
            <div className="fg"><label className="fl">Gewünschtes Ergebnis</label>
              <input className="fi" placeholder="Wann ist es wirklich fertig?" value={f.ergebnis} onChange={e => setF(p => ({ ...p, ergebnis: e.target.value }))} /></div>
            <div className="fa">
              <button className="btn btn-g" onClick={() => setModal(null)}>Abbrechen</button>
              <button className="btn btn-p" onClick={save} disabled={saving}>{saving ? 'Speichern…' : 'Aufgabe speichern'}</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function EntscheidungModal() {
    const [f, setF] = useState({ titel: '', begruendung: '', person: aktiv, projekt: 'Cap', datum: today() })
    const [saving, setSaving] = useState(false)
    const save = async () => {
      if (!f.titel.trim()) return alert('Bitte ausfüllen')
      setSaving(true)
      await supabase.from('entscheidungen').insert(f)
      setSaving(false); setModal(null); laden()
    }
    return (
      <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
        <div className="modal">
          <div className="modal-h">
            <div className="modal-title">Entscheidung dokumentieren</div>
            <button className="modal-x" onClick={() => setModal(null)}>×</button>
          </div>
          <div className="modal-b">
            <div className="fg"><label className="fl">Was wurde entschieden? *</label>
              <input className="fi" placeholder="z.B. Snap-Abstand wird auf 55mm festgelegt" value={f.titel} onChange={e => setF(p => ({ ...p, titel: e.target.value }))} autoFocus /></div>
            <div className="fg"><label className="fl">Warum?</label>
              <textarea className="fi" placeholder="Begründung..." value={f.begruendung} onChange={e => setF(p => ({ ...p, begruendung: e.target.value }))} /></div>
            <div className="fr">
              <div className="fg"><label className="fl">Von wem</label>
                <select className="fi" value={f.person} onChange={e => setF(p => ({ ...p, person: e.target.value }))}>
                  {PERSONEN.map(p => <option key={p}>{p}</option>)}</select></div>
              <div className="fg"><label className="fl">Bereich</label>
                <select className="fi" value={f.projekt} onChange={e => setF(p => ({ ...p, projekt: e.target.value }))}>
                  {PROJEKTE.map(p => <option key={p}>{p}</option>)}</select></div>
            </div>
            <div className="fg"><label className="fl">Datum</label>
              <input type="date" className="fi" value={f.datum} onChange={e => setF(p => ({ ...p, datum: e.target.value }))} /></div>
            <div className="fa">
              <button className="btn btn-g" onClick={() => setModal(null)}>Abbrechen</button>
              <button className="btn btn-p" onClick={save} disabled={saving}>{saving ? '…' : 'Speichern'}</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function DateiModal() {
    const [name, setName] = useState('')
    const [projekt, setProjekt] = useState('Cap')
    const ref = useRef<HTMLInputElement>(null)
    return (
      <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
        <div className="modal">
          <div className="modal-h">
            <div className="modal-title">Datei hochladen</div>
            <button className="modal-x" onClick={() => setModal(null)}>×</button>
          </div>
          <div className="modal-b">
            <div className="fg"><label className="fl">Name</label>
              <input className="fi" placeholder="z.B. Tech Pack Cap v2" value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="fg"><label className="fl">Bereich</label>
              <select className="fi" value={projekt} onChange={e => setProjekt(e.target.value)}>
                {PROJEKTE.map(p => <option key={p}>{p}</option>)}</select></div>
            <div className="upload-zone" onClick={() => ref.current?.click()}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📎</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{uploading ? 'Wird hochgeladen…' : 'Datei auswählen'}</div>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>PDF, Word, Excel, Bilder — max 50MB</div>
              <input ref={ref} type="file" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f, projekt, name) }} />
            </div>
            <div className="fa"><button className="btn btn-g" onClick={() => setModal(null)}>Schließen</button></div>
          </div>
        </div>
      </div>
    )
  }

  const totalByPerson = aufgaben.filter(a => a.person === aktiv).length
  const donePct = totalByPerson > 0 ? Math.round(aufgaben.filter(a => a.person === aktiv && a.status === 'Erledigt').length / totalByPerson * 100) : 0

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-top">
            <div className="logo">QUADRAS</div>
            <div className="logo-sub">Founder Operating System</div>
          </div>
          <div className="person-block">
            <div className="person-label">Aktive Person</div>
            <div className="person-btns">
              {PERSONEN.map(p => (
                <button key={p} className={`pbtn ${aktiv === p ? 'active' : ''}`}
                  style={aktiv === p ? { background: PERSON_COLOR[p] } : {}} onClick={() => setAktiv(p)}>
                  {p[0]}
                </button>
              ))}
            </div>
          </div>
          <nav className="nav">
            {([['heute', '☀️', 'Mein Heute'], ['aufgaben', '✅', 'Aufgaben'], ['dateien', '📁', 'Dateien'], ['entscheidungen', '🧠', 'Entscheidungen']] as const).map(([id, ico, lbl]) => (
              <div key={id} className={`nav-item ${ansicht === id ? 'active' : ''}`} onClick={() => setAnsicht(id)}>
                <span className="nav-icon">{ico}</span>{lbl}
              </div>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="stat"><div className="stat-num" style={{ color: meineOffen > 0 ? PERSON_COLOR[aktiv] : 'var(--text)' }}>{meineOffen}</div><div className="stat-label">Meine</div></div>
            <div className="stat"><div className="stat-num">{offenGesamt}</div><div className="stat-label">Team</div></div>
            <div className="stat"><div className="stat-num" style={{ color: ueberfaellig > 0 ? 'var(--red)' : 'var(--text)' }}>{ueberfaellig}</div><div className="stat-label">Überfällig</div></div>
          </div>
        </aside>

        <main className="main">
          {ansicht === 'heute' && (
            <div>
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 }}>
                Hallo, {aktiv} 👋
              </div>
              <div style={{ fontSize: 15, color: 'var(--text2)', marginBottom: 28 }}>
                {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div className="heute-grid">
                <div className="metric">
                  <div className="metric-n" style={{ color: PERSON_COLOR[aktiv] }}>{meineOffen}</div>
                  <div className="metric-l">Meine offenen Aufgaben</div>
                  <div className="pb"><div className="pbf" style={{ width: `${donePct}%` }} /></div>
                </div>
                <div className="metric">
                  <div className="metric-n" style={{ color: ueberfaellig > 0 ? 'var(--red)' : 'var(--green)' }}>{ueberfaellig}</div>
                  <div className="metric-l">Überfällig im Team</div>
                </div>
                <div className="metric">
                  <div className="metric-n">{entscheidungen.length}</div>
                  <div className="metric-l">Entscheidungen gesamt</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Deine Aufgaben</div>
                <button className="btn btn-p btn-sm" onClick={() => { setEditAufgabe(null); setModal('aufgabe') }}>+ Neue Aufgabe</button>
              </div>
              <div className="card" style={{ marginBottom: 28 }}>
                {meineAufgaben.length === 0
                  ? <div className="empty"><div className="empty-ico">✨</div><div className="empty-t">Alles erledigt!</div><div className="empty-s">Keine offenen Aufgaben</div></div>
                  : meineAufgaben.map(a => <AItem key={a.id} a={a} />)}
              </div>

              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Was das Team gerade macht</div>
              <div className="team-grid">
                {PERSONEN.filter(p => p !== aktiv).map(p => {
                  const pA = aufgaben.filter(a => a.person === p && a.status !== 'Erledigt')
                  return (
                    <div className="card" key={p}>
                      <div className="section-h">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: PERSON_COLOR[p] }} />
                          <span style={{ fontWeight: 700 }}>{p}</span>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{pA.length} offen</span>
                      </div>
                      {pA.slice(0, 4).map(a => (
                        <div key={a.id} style={{ padding: '9px 16px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                          <div style={{ fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.titel}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{a.projekt}{a.deadline ? ` · bis ${fmtDate(a.deadline)}` : ''}</div>
                        </div>
                      ))}
                      {pA.length === 0 && <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text3)' }}>Alles erledigt ✓</div>}
                      {pA.length > 4 && <div style={{ padding: '9px 16px', fontSize: 12, color: 'var(--text3)' }}>+ {pA.length - 4} weitere</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {ansicht === 'aufgaben' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div className="page-title">Aufgaben</div>
                  <div className="page-sub">{gefiltert.length} Aufgaben gefunden</div>
                </div>
                <button className="btn btn-p" onClick={() => { setEditAufgabe(null); setModal('aufgabe') }}>+ Neue Aufgabe</button>
              </div>
              <div className="filter-bar">
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', alignSelf: 'center' }}>PERSON</span>
                {['Alle', ...PERSONEN].map(p => <div key={p} className={`chip ${fPerson === p ? 'on' : ''}`} onClick={() => setFPerson(p)}>{p}</div>)}
              </div>
              <div className="filter-bar">
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', alignSelf: 'center' }}>BEREICH</span>
                {['Alle', ...PROJEKTE].map(p => <div key={p} className={`chip ${fProjekt === p ? 'on' : ''}`} onClick={() => setFProjekt(p)}>{p}</div>)}
              </div>
              <div className="filter-bar" style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', alignSelf: 'center' }}>STATUS</span>
                {['Alle', ...STATUS_LIST].map(s => <div key={s} className={`chip ${fStatus === s ? 'on' : ''}`} onClick={() => setFStatus(s)}>{s}</div>)}
              </div>
              <div className="card">
                {gefiltert.length === 0
                  ? <div className="empty"><div className="empty-ico">🔍</div><div className="empty-t">Keine Aufgaben</div><div className="empty-s">Filter anpassen oder neue Aufgabe erstellen</div></div>
                  : gefiltert.map(a => <AItem key={a.id} a={a} editable />)}
              </div>
            </div>
          )}

          {ansicht === 'dateien' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div className="page-title">Dateien</div>
                  <div className="page-sub">Tech Packs, Angebote, Dokumente — alles an einem Ort</div>
                </div>
                <button className="btn btn-p" onClick={() => setModal('datei')}>+ Hochladen</button>
              </div>
              <div className="filter-bar" style={{ marginBottom: 20 }}>
                {['Alle', ...PROJEKTE].map(p => <div key={p} className={`chip ${fProjekt === p ? 'on' : ''}`} onClick={() => setFProjekt(p)}>{p}</div>)}
              </div>
              <div className="card">
                {dateien.filter(d => fProjekt === 'Alle' || d.projekt === fProjekt).length === 0
                  ? <div className="empty"><div className="empty-ico">📁</div><div className="empty-t">Noch keine Dateien</div><div className="empty-s">Tech Packs, Angebote, Bilder hier hochladen</div></div>
                  : dateien.filter(d => fProjekt === 'Alle' || d.projekt === fProjekt).map(d => (
                    <div className="datei-row" key={d.id}>
                      <div className="datei-ico">{fileIcon(d.dateiname)}</div>
                      <div className="datei-info">
                        <div className="datei-name">{d.name}</div>
                        <div className="datei-meta">{d.projekt} · {d.hochgeladen_von} · {fmtDate(d.created_at.split('T')[0])} · {Math.round(d.groesse / 1024)}KB</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                          <button className="btn btn-g btn-sm">↓ Download</button>
                        </a>
                        <button className="btn btn-d btn-sm" onClick={() => delDatei(d)}>Löschen</button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {ansicht === 'entscheidungen' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div className="page-title">Entscheidungen</div>
                  <div className="page-sub">Was wurde entschieden — und warum</div>
                </div>
                <button className="btn btn-p" onClick={() => setModal('entscheidung')}>+ Entscheidung</button>
              </div>
              <div className="card">
                {entscheidungen.length === 0
                  ? <div className="empty"><div className="empty-ico">🧠</div><div className="empty-t">Noch keine Entscheidungen</div><div className="empty-s">Jede wichtige Entscheidung hier festhalten</div></div>
                  : entscheidungen.map(e => (
                    <div className="ent-row" key={e.id}>
                      <div className="ent-titel">{e.titel}</div>
                      {e.begruendung && <div className="ent-why">{e.begruendung}</div>}
                      <div className="ent-meta">
                        <span className="tag tag-proj">{e.projekt}</span>
                        <span className="tag tag-person" style={{ background: PERSON_COLOR[e.person] || '#8e8e93' }}>{e.person}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtDate(e.datum)}</span>
                        <button className="ibtn del" style={{ marginLeft: 'auto' }} onClick={() => delEntscheidung(e.id)}>×</button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {modal === 'aufgabe' && <AufgabeModal />}
      {modal === 'entscheidung' && <EntscheidungModal />}
      {modal === 'datei' && <DateiModal />}
    </>
  )
}

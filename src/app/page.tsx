'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase, OWNERS, STATUS_AUFGABEN, PRIO, STATUS_PRODUKT, STATUS_LIEFERANT, BEWERTUNG, STATUS_SAMPLE, STATUS_CONTENT, KAT_AUFGABEN, KAT_FINANZEN } from '../lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────
type Aufgabe = { id: string; titel: string; status: string; prioritaet: string; owner: string; deadline: string|null; definition_of_done: string; kategorie: string; blocker: string; notiz: string; produkt_id: string|null; lieferant_id: string|null; erledigt_am: string|null; created_at: string }
type Produkt = { id: string; name: string; status: string; lead: string; naechster_schritt: string; naechster_schritt_deadline: string|null; ziel_vk: number; ziel_ek: number; kategorie: string; offene_fragen: string; created_at: string }
type Lieferant = { id: string; name: string; kategorie: string; status: string; bewertung: string; ansprechpartner: string; email: string; whatsapp: string; letzter_kontakt: string|null; naechster_followup: string|null; notizen: string; moq: number; ek_preis: number; sample_kosten_usd: number; lt_sample_tage: number; lt_bulk_tage: number; grs_zertifikat: boolean; created_at: string }
type Sample = { id: string; name: string; status: string; produkt_id: string|null; lieferant_id: string|null; version: number; angefragt_am: string|null; erwartet_am: string|null; angekommen_am: string|null; tracking_nr: string; kosten_usd: number; review_gut: string; review_fehlt: string; aenderungen: string; score: number; entscheidung: string; freigabe: boolean; naechster_schritt: string; created_at: string }
type ContentItem = { id: string; titel: string; status: string; format: string; plattform: string; owner: string; veroeffentlichungsdatum: string|null; produkt_id: string|null; caption: string; visual_idee: string; created_at: string }
type Finanzen = { id: string; position: string; kategorie: string; betrag_eur: number; waehrung: string; bezahlt: boolean; datum: string|null; produkt_id: string|null; lieferant_id: string|null; kommentar: string; created_at: string }
type Entscheidung = { id: string; entscheidung: string; warum: string; entschieden_von: string; datum: string; auswirkung: string; status: string; naechster_schritt: string; produkt_id: string|null; created_at: string }

type View = 'hq'|'aufgaben'|'produkte'|'lieferanten'|'samples'|'content'|'finanzen'|'entscheidungen'|'board-at'|'board-op'|'board-dc'

// ── Helpers ────────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0]
const isOverdue = (d: string|null) => d && d < today()
const fmt = (d: string|null) => d ? new Date(d).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}) : '–'
const prioBadge = (p: string) => { const m: Record<string,string> = {P0:'badge-p0',P1:'badge-p1',P2:'badge-p2',P3:'badge-p3'}; return m[p]||'badge-gray' }
const ownerChip = (o: string) => { const m: Record<string,string> = {AT:'owner-at',OP:'owner-op',DC:'owner-dc'}; return m[o]||'' }
const statusColor = (s: string): string => {
  if(['Aktiv','Freigegeben','Live','Launchbereit','Erledigt'].includes(s)) return 'badge-green'
  if(['Blockiert','Abgelehnt','P0'].includes(s)) return 'badge-red'
  if(['Wartet extern','Angebot','In Review','Änderungen'].includes(s)) return 'badge-amber'
  if(['In Arbeit','Sample läuft','In Produktion'].includes(s)) return 'badge-blue'
  return 'badge-gray'
}

// ── Modal Form ─────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: ()=>void; children: React.ReactNode }) {
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── AufgabeForm ────────────────────────────────────────────────────────────────
function AufgabeForm({ initial, produkte, lieferanten, currentOwner, onSave, onClose }:
  { initial?: Partial<Aufgabe>; produkte: Produkt[]; lieferanten: Lieferant[]; currentOwner: string; onSave: ()=>void; onClose: ()=>void }) {
  const [f, setF] = useState({
    titel: initial?.titel||'', status: initial?.status||'Inbox', prioritaet: initial?.prioritaet||'P2',
    owner: initial?.owner||currentOwner, deadline: initial?.deadline||'', definition_of_done: initial?.definition_of_done||'',
    kategorie: initial?.kategorie||'', blocker: initial?.blocker||'', notiz: initial?.notiz||'',
    produkt_id: initial?.produkt_id||null as string|null, lieferant_id: initial?.lieferant_id||null as string|null,
  })
  const [saving, setSaving] = useState(false)
  const up = (k: string, v: string|null) => setF(p=>({...p,[k]:v}))

  const save = async () => {
    if(!f.titel.trim()) return alert('Titel ist Pflichtfeld')
    if(!f.owner) return alert('Owner ist Pflichtfeld')
    if(!f.deadline) return alert('Deadline ist Pflichtfeld')
    if(!f.definition_of_done.trim()) return alert('Definition of Done ist Pflichtfeld')
    setSaving(true)
    const data = { ...f, deadline: f.deadline||null, produkt_id: f.produkt_id||null, lieferant_id: f.lieferant_id||null }
    if(initial?.id) {
      await supabase.from('aufgaben').update(data).eq('id', initial.id)
    } else {
      await supabase.from('aufgaben').insert(data)
    }
    setSaving(false); onSave(); onClose()
  }

  return (
    <div>
      <div className="alert alert-amber" style={{marginBottom:16}}>
        ⚡ 5-Punkt-Regel: Aktionsverb · Owner · Deadline · Definition of Done · Kontext
      </div>
      <div className="form-group"><label>Aufgabe (Aktionsverb + Kontext)*</label><input placeholder="z.B. Nana Follow-up zu Patch v1 Sample senden" value={f.titel} onChange={e=>up('titel',e.target.value)}/></div>
      <div className="form-row">
        <div className="form-group"><label>Owner*</label><select value={f.owner} onChange={e=>up('owner',e.target.value)}>{OWNERS.map(o=><option key={o}>{o}</option>)}</select></div>
        <div className="form-group"><label>Priorität*</label><select value={f.prioritaet} onChange={e=>up('prioritaet',e.target.value)}>{PRIO.map(p=><option key={p}>{p}</option>)}</select></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>Deadline*</label><input type="date" value={f.deadline} onChange={e=>up('deadline',e.target.value)}/></div>
        <div className="form-group"><label>Status</label><select value={f.status} onChange={e=>up('status',e.target.value)}>{STATUS_AUFGABEN.map(s=><option key={s}>{s}</option>)}</select></div>
      </div>
      <div className="form-group"><label>Definition of Done* — Woran erkennen wir, dass es WIRKLICH fertig ist?</label><textarea placeholder="z.B. Antwort von Nana erhalten, ETA und Tracking-Nr in Notion dokumentiert" value={f.definition_of_done} onChange={e=>up('definition_of_done',e.target.value)} style={{minHeight:60}}/></div>
      <div className="form-row">
        <div className="form-group"><label>Kategorie</label><select value={f.kategorie} onChange={e=>up('kategorie',e.target.value)}><option value="">–</option>{KAT_AUFGABEN.map(k=><option key={k}>{k}</option>)}</select></div>
        <div className="form-group"><label>Produkt</label><select value={f.produkt_id||''} onChange={e=>up('produkt_id',e.target.value||null)}><option value="">–</option>{produkte.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>Lieferant</label><select value={f.lieferant_id||''} onChange={e=>up('lieferant_id',e.target.value||null)}><option value="">–</option>{lieferanten.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
        <div className="form-group"><label>Blocker</label><input placeholder="Was blockiert?" value={f.blocker} onChange={e=>up('blocker',e.target.value)}/></div>
      </div>
      <div className="form-group"><label>Notiz / Kontext</label><textarea placeholder="Alles was der Owner wissen muss" value={f.notiz} onChange={e=>up('notiz',e.target.value)} style={{minHeight:50}}/></div>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:8}}>
        <button className="btn btn-outline" onClick={onClose}>Abbrechen</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Speichern…':'Aufgabe speichern'}</button>
      </div>
    </div>
  )
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState<View>('hq')
  const [currentOwner, setCurrentOwner] = useState('AT')
  const [aufgaben, setAufgaben] = useState<Aufgabe[]>([])
  const [produkte, setProdukte] = useState<Produkt[]>([])
  const [lieferanten, setLieferanten] = useState<Lieferant[]>([])
  const [samples, setSamples] = useState<Sample[]>([])
  const [content, setContent] = useState<ContentItem[]>([])
  const [finanzen, setFinanzen] = useState<Finanzen[]>([])
  const [entscheidungen, setEntscheidungen] = useState<Entscheidung[]>([])
  const [showAufgabeModal, setShowAufgabeModal] = useState(false)
  const [editAufgabe, setEditAufgabe] = useState<Aufgabe|null>(null)
  const [showProduktModal, setShowProduktModal] = useState(false)
  const [showLieferantModal, setShowLieferantModal] = useState(false)
  const [showSampleModal, setShowSampleModal] = useState(false)
  const [showContentModal, setShowContentModal] = useState(false)
  const [showFinanzModal, setShowFinanzModal] = useState(false)
  const [showEntscheidungModal, setShowEntscheidungModal] = useState(false)

  const load = useCallback(async () => {
    const [a,p,l,s,c,f,e] = await Promise.all([
      supabase.from('aufgaben').select('*').order('created_at',{ascending:false}),
      supabase.from('produkte').select('*').order('created_at',{ascending:false}),
      supabase.from('lieferanten').select('*').order('created_at',{ascending:false}),
      supabase.from('samples').select('*').order('created_at',{ascending:false}),
      supabase.from('content').select('*').order('created_at',{ascending:false}),
      supabase.from('finanzen').select('*').order('datum',{ascending:false}),
      supabase.from('entscheidungen').select('*').order('datum',{ascending:false}),
    ])
    if(a.data) setAufgaben(a.data)
    if(p.data) setProdukte(p.data)
    if(l.data) setLieferanten(l.data)
    if(s.data) setSamples(s.data)
    if(c.data) setContent(c.data)
    if(f.data) setFinanzen(f.data)
    if(e.data) setEntscheidungen(e.data)
  }, [])

  useEffect(() => { load() }, [load])

  // Realtime
  useEffect(() => {
    const tables = ['aufgaben','produkte','lieferanten','samples','content','finanzen','entscheidungen']
    const subs = tables.map(t => supabase.channel(`rt-${t}`).on('postgres_changes',{event:'*',schema:'public',table:t},()=>load()).subscribe())
    return () => { subs.forEach(s => supabase.removeChannel(s)) }
  }, [load])

  const deleteAufgabe = async (id: string) => { if(confirm('Aufgabe löschen?')) { await supabase.from('aufgaben').delete().eq('id',id); load() } }
  const updateStatus = async (id: string, status: string) => { await supabase.from('aufgaben').update({status}).eq('id',id); load() }
  const updateAufgabeField = async (id: string, field: string, value: string|boolean|null) => { await supabase.from('aufgaben').update({[field]:value}).eq('id',id); load() }

  // Computed metrics
  const t = today()
  const p0Open = aufgaben.filter(a=>a.prioritaet==='P0'&&a.status!=='Erledigt'&&a.status!=='Gestrichen')
  const blocked = aufgaben.filter(a=>a.status==='Blockiert')
  const overdue = aufgaben.filter(a=>a.deadline&&a.deadline<t&&a.status!=='Erledigt'&&a.status!=='Gestrichen')
  const followupsToday = lieferanten.filter(l=>l.naechster_followup===t)
  const samplesReview = samples.filter(s=>s.status==='Angekommen'||s.status==='In Review'||s.status==='Änderungen')
  const produkteNoNext = produkte.filter(p=>!p.naechster_schritt||p.naechster_schritt.trim()==='')
  const myTasks = aufgaben.filter(a=>a.owner===currentOwner&&a.status!=='Erledigt'&&a.status!=='Gestrichen')
  const todayTasks = aufgaben.filter(a=>a.status==='Heute'&&a.status!=='Erledigt')

  const getPName = (id: string|null) => produkte.find(p=>p.id===id)?.name||'–'
  const getLName = (id: string|null) => lieferanten.find(l=>l.id===id)?.name||'–'

  const navItems: {id:View;label:string;icon:string}[] = [
    {id:'hq',label:'HQ Cockpit',icon:'dashboard'},
    {id:'board-at',label:'Board · AT',icon:'user'},
    {id:'board-op',label:'Board · OP',icon:'user'},
    {id:'board-dc',label:'Board · DC',icon:'user'},
    {id:'aufgaben',label:'Aufgaben',icon:'checkbox'},
    {id:'produkte',label:'Produkte',icon:'box'},
    {id:'lieferanten',label:'Lieferanten',icon:'building-factory'},
    {id:'samples',label:'Samples',icon:'flask'},
    {id:'content',label:'Content',icon:'speakerphone'},
    {id:'finanzen',label:'Finanzen',icon:'currency-euro'},
    {id:'entscheidungen',label:'Entscheidungen',icon:'brain'},
  ]

  // ── Aufgaben Table ────────────────────────────────────────────────────────────
  function AufgabenTable({ tasks, title }: { tasks: Aufgabe[]; title?: string }) {
    if(tasks.length===0) return <div className="empty">Keine Aufgaben</div>
    return (
      <div className="table-wrap">
        {title && <div style={{fontSize:12,fontWeight:600,color:'var(--mid)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.04em'}}>{title}</div>}
        <table>
          <thead><tr><th>Aufgabe</th><th>Owner</th><th>Prio</th><th>Deadline</th><th>Status</th><th>Produkt</th><th></th></tr></thead>
          <tbody>{tasks.map(a=>(
            <tr key={a.id} className={isOverdue(a.deadline)?'overdue':''}>
              <td style={{maxWidth:300}}>
                <div style={{fontWeight:500,fontSize:13}}>{a.titel}</div>
                {a.blocker&&<div style={{fontSize:11,color:'var(--red)',marginTop:2}}>⚠ {a.blocker}</div>}
                {a.definition_of_done&&<div style={{fontSize:11,color:'var(--mid)',marginTop:1}}>✓ {a.definition_of_done}</div>}
              </td>
              <td><span className={`owner-chip ${ownerChip(a.owner)}`}>{a.owner}</span></td>
              <td><span className={`badge ${prioBadge(a.prioritaet)}`}>{a.prioritaet}</span></td>
              <td style={{color:isOverdue(a.deadline)?'var(--red)':'inherit',fontWeight:isOverdue(a.deadline)?600:400}}>{fmt(a.deadline)}</td>
              <td>
                <select value={a.status} onChange={e=>updateStatus(a.id,e.target.value)} style={{width:130,padding:'3px 6px',fontSize:12}}>
                  {STATUS_AUFGABEN.map(s=><option key={s}>{s}</option>)}
                </select>
              </td>
              <td style={{fontSize:12,color:'var(--mid)'}}>{getPName(a.produkt_id)}</td>
              <td>
                <div style={{display:'flex',gap:4}}>
                  <button className="btn btn-outline btn-sm" onClick={()=>{setEditAufgabe(a);setShowAufgabeModal(true)}}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={()=>deleteAufgabe(a.id)}>×</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    )
  }

  // ── HQ View ───────────────────────────────────────────────────────────────────
  function HQView() {
    return (
      <div>
        <div className="page-header"><h2>QUADRAS HQ</h2><p>Central operating system · Product · Supplier · Launch · Execution</p></div>

        <div className="topbar">
          <div className="topbar-item">Monatsfokus: <span>Cap Sample v1 freigeben</span></div>
          <div className="topbar-item">Launch-Ziel: <span>Q3 2026</span></div>
          <div className="topbar-item">Team: <span>{currentOwner} aktiv</span></div>
        </div>

        <div className="metrics">
          <div className="metric"><div className="metric-label">P0 offen</div><div className={`metric-value ${p0Open.length>0?'red':'green'}`}>{p0Open.length}</div></div>
          <div className="metric"><div className="metric-label">Blockiert</div><div className={`metric-value ${blocked.length>0?'red':'green'}`}>{blocked.length}</div></div>
          <div className="metric"><div className="metric-label">Überfällig</div><div className={`metric-value ${overdue.length>0?'amber':'green'}`}>{overdue.length}</div></div>
          <div className="metric"><div className="metric-label">Follow-ups heute</div><div className={`metric-value ${followupsToday.length>0?'amber':'green'}`}>{followupsToday.length}</div></div>
          <div className="metric"><div className="metric-label">Samples in Review</div><div className={`metric-value ${samplesReview.length>0?'signal':'green'}`}>{samplesReview.length}</div></div>
          <div className="metric"><div className="metric-label">Produkte o. Schritt</div><div className={`metric-value ${produkteNoNext.length>0?'red':'green'}`}>{produkteNoNext.length}</div></div>
        </div>

        <div className="quick-actions">
          <button className="btn btn-primary" onClick={()=>{setEditAufgabe(null);setShowAufgabeModal(true)}}>+ Aufgabe</button>
          <button className="btn btn-danger" onClick={()=>{setEditAufgabe({prioritaet:'P0'} as Aufgabe);setShowAufgabeModal(true)}}>+ P0-Aufgabe</button>
          <button className="btn btn-outline" onClick={()=>setShowLieferantModal(true)}>+ Lieferant</button>
          <button className="btn btn-outline" onClick={()=>setShowSampleModal(true)}>+ Sample</button>
          <button className="btn btn-outline" onClick={()=>setShowEntscheidungModal(true)}>+ Entscheidung</button>
          <button className="btn btn-outline" onClick={()=>setShowContentModal(true)}>+ Content-Idee</button>
        </div>

        {p0Open.length>0&&(
          <div className="alert alert-red" style={{marginBottom:16}}>
            🔴 {p0Open.length} offene P0-Aufgaben — sofort handeln: {p0Open.slice(0,3).map(a=>a.titel).join(' · ')}
          </div>
        )}
        {overdue.length>0&&(
          <div className="alert alert-amber" style={{marginBottom:16}}>
            ⚠ {overdue.length} überfällige Aufgaben: {overdue.slice(0,3).map(a=>a.titel).join(' · ')}
          </div>
        )}

        <div className="grid-2" style={{marginBottom:16}}>
          <div className="card">
            <div className="card-header"><span className="card-title">Meine Aufgaben heute · {currentOwner}</span></div>
            <AufgabenTable tasks={myTasks.filter(a=>a.status==='Heute').slice(0,8)}/>
            {myTasks.filter(a=>a.status==='Heute').length===0&&<div className="empty">Keine Heute-Aufgaben</div>}
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">P0 Aufgaben — Team</span></div>
            <AufgabenTable tasks={p0Open.slice(0,8)}/>
          </div>
        </div>

        <div className="grid-2" style={{marginBottom:16}}>
          <div className="card">
            <div className="card-header"><span className="card-title">Blockiert</span></div>
            <AufgabenTable tasks={blocked.slice(0,6)}/>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Überfällig</span></div>
            <AufgabenTable tasks={overdue.slice(0,6)}/>
          </div>
        </div>

        <div className="grid-3" style={{marginBottom:16}}>
          <div className="card">
            <div className="card-header"><span className="card-title">Samples in Review</span></div>
            {samplesReview.length===0?<div className="empty">Keine</div>:<div className="table-wrap"><table><thead><tr><th>Sample</th><th>Status</th><th>Score</th></tr></thead><tbody>{samplesReview.map(s=><tr key={s.id}><td style={{fontWeight:500,fontSize:12}}>{s.name}</td><td><span className={`badge ${statusColor(s.status)}`}>{s.status}</span></td><td>{s.score||'–'}/10</td></tr>)}</tbody></table></div>}
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Supplier Follow-ups heute</span></div>
            {followupsToday.length===0?<div className="empty">Keine fällig</div>:<div className="table-wrap"><table><thead><tr><th>Lieferant</th><th>Bewertung</th></tr></thead><tbody>{followupsToday.map(l=><tr key={l.id}><td style={{fontWeight:500,fontSize:12}}>{l.name}</td><td><span className={`badge ${l.bewertung==='A'?'badge-green':'badge-gray'}`}>{l.bewertung}</span></td></tr>)}</tbody></table></div>}
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Produkte — Needs Attention</span></div>
            {produkteNoNext.length===0?<div className="empty">Alle Produkte haben nächsten Schritt ✓</div>:<div className="table-wrap"><table><thead><tr><th>Produkt</th><th>Status</th></tr></thead><tbody>{produkteNoNext.map(p=><tr key={p.id}><td style={{fontWeight:500,fontSize:12}}>{p.name}</td><td><span className={`badge ${statusColor(p.status)}`}>{p.status}</span></td></tr>)}</tbody></table></div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Produktpipeline</span></div>
          <div className="kanban">
            {STATUS_PRODUKT.slice(0,10).map(s=>(
              <div className="kanban-col" key={s}>
                <div className="kanban-col-header">{s}</div>
                <div className="kanban-col-body">
                  {produkte.filter(p=>p.status===s).map(p=>(
                    <div className="kanban-card" key={p.id}>
                      <div className="kanban-card-title">{p.name}</div>
                      <div className="kanban-card-meta">
                        {p.lead&&<span className={`owner-chip ${ownerChip(p.lead)}`}>{p.lead}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Personal Board ────────────────────────────────────────────────────────────
  function PersonalBoard({ owner }: { owner: string }) {
    const mine = aufgaben.filter(a=>a.owner===owner&&a.status!=='Erledigt'&&a.status!=='Gestrichen')
    const mineToday = mine.filter(a=>a.status==='Heute')
    const mineWeek = mine.filter(a=>a.status==='Diese Woche')
    const mineOverdue = mine.filter(a=>a.deadline&&a.deadline<t&&a.status!=='Erledigt')
    const mineBlocked = mine.filter(a=>a.status==='Blockiert')
    const mineWaiting = mine.filter(a=>a.status==='Wartet extern')
    const mineP0 = mine.filter(a=>a.prioritaet==='P0')
    const roleDesc = {AT:'Founder · Brand & Product Lead',OP:'Operations · Supplier & Production Lead',DC:'Design · Content · Website Lead'}[owner]||''
    return (
      <div>
        <div className="page-header">
          <h2>Board · {owner}</h2>
          <p>{roleDesc}</p>
        </div>
        {mineP0.length>0&&<div className="alert alert-red">🔴 {mineP0.length} P0-Aufgaben offen: {mineP0.slice(0,2).map(a=>a.titel).join(' · ')}</div>}
        {mineOverdue.length>0&&<div className="alert alert-amber">⚠ {mineOverdue.length} Aufgaben überfällig</div>}
        <div className="metrics">
          <div className="metric"><div className="metric-label">Heute</div><div className={`metric-value ${mineToday.length>0?'signal':'green'}`}>{mineToday.length}</div></div>
          <div className="metric"><div className="metric-label">Diese Woche</div><div className="metric-value">{mineWeek.length}</div></div>
          <div className="metric"><div className="metric-label">Überfällig</div><div className={`metric-value ${mineOverdue.length>0?'red':'green'}`}>{mineOverdue.length}</div></div>
          <div className="metric"><div className="metric-label">P0 offen</div><div className={`metric-value ${mineP0.length>0?'red':'green'}`}>{mineP0.length}</div></div>
        </div>
        <div style={{marginBottom:16}}><button className="btn btn-primary" onClick={()=>{setEditAufgabe({owner} as Aufgabe);setShowAufgabeModal(true)}}>+ Aufgabe für {owner}</button></div>
        <div className="card" style={{marginBottom:16}}>
          <div className="card-header"><span className="card-title">Heute</span></div>
          <AufgabenTable tasks={mineToday}/>
        </div>
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><span className="card-title">Diese Woche</span></div>
            <AufgabenTable tasks={mineWeek}/>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Wartet auf extern</span></div>
            <AufgabenTable tasks={mineWaiting}/>
          </div>
        </div>
        {owner==='OP'&&(
          <div className="card" style={{marginTop:16}}>
            <div className="card-header"><span className="card-title">Supplier Follow-ups fällig</span></div>
            {lieferanten.filter(l=>l.naechster_followup&&l.naechster_followup<=t).length===0
              ?<div className="empty">Keine fällig</div>
              :<div className="table-wrap"><table><thead><tr><th>Lieferant</th><th>Bewertung</th><th>Fällig</th><th>Notiz</th></tr></thead><tbody>
                {lieferanten.filter(l=>l.naechster_followup&&l.naechster_followup<=t).map(l=><tr key={l.id}>
                  <td style={{fontWeight:500}}>{l.name}</td>
                  <td><span className={`badge ${l.bewertung==='A'?'badge-green':'badge-gray'}`}>{l.bewertung}</span></td>
                  <td style={{color:'var(--red)'}}>{fmt(l.naechster_followup)}</td>
                  <td style={{fontSize:12,color:'var(--mid)'}}>{l.notizen?.substring(0,60)||'–'}</td>
                </tr>)}
              </tbody></table></div>
            }
          </div>
        )}
        {owner==='DC'&&(
          <div className="card" style={{marginTop:16}}>
            <div className="card-header"><span className="card-title">Content in Produktion</span></div>
            {content.filter(c=>c.owner===owner&&['Skript','In Produktion','Review'].includes(c.status)).length===0
              ?<div className="empty">Nichts in Produktion</div>
              :<div className="table-wrap"><table><thead><tr><th>Content</th><th>Format</th><th>Status</th><th>Datum</th></tr></thead><tbody>
                {content.filter(c=>c.owner===owner&&['Skript','In Produktion','Review'].includes(c.status)).map(c=><tr key={c.id}>
                  <td style={{fontWeight:500}}>{c.titel}</td><td style={{fontSize:12}}>{c.format}</td>
                  <td><span className={`badge ${statusColor(c.status)}`}>{c.status}</span></td>
                  <td style={{fontSize:12}}>{fmt(c.veroeffentlichungsdatum)}</td>
                </tr>)}
              </tbody></table></div>
            }
          </div>
        )}
      </div>
    )
  }

  // ── Aufgaben View ─────────────────────────────────────────────────────────────
  function AufgabenView() {
    const [filter, setFilter] = useState<string>('alle')
    const [prioFilter, setPrioFilter] = useState('')
    const filtered = aufgaben.filter(a=>{
      if(prioFilter&&a.prioritaet!==prioFilter) return false
      if(filter==='heute') return a.status==='Heute'
      if(filter==='woche') return a.status==='Diese Woche'||a.status==='Heute'
      if(filter==='mine') return a.owner===currentOwner&&a.status!=='Erledigt'
      if(filter==='p0') return a.prioritaet==='P0'&&a.status!=='Erledigt'
      if(filter==='blockiert') return a.status==='Blockiert'
      if(filter==='ueberfaellig') return isOverdue(a.deadline)&&a.status!=='Erledigt'
      if(filter==='erledigt') return a.status==='Erledigt'
      return a.status!=='Erledigt'&&a.status!=='Gestrichen'
    })
    return (
      <div>
        <div className="page-header"><h2>Aufgaben</h2><p>Alle Aufgaben · 5-Punkt-Regel gilt immer</p></div>
        <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
          <button className="btn btn-primary" onClick={()=>{setEditAufgabe(null);setShowAufgabeModal(true)}}>+ Neue Aufgabe</button>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {[['alle','Alle'],['mine','Meine'],['heute','Heute'],['woche','Diese Woche'],['p0','P0'],['blockiert','Blockiert'],['ueberfaellig','Überfällig'],['erledigt','Erledigt']].map(([k,l])=>(
              <button key={k} className={`btn btn-sm ${filter===k?'btn-primary':'btn-outline'}`} onClick={()=>setFilter(k)}>{l}</button>
            ))}
          </div>
          <select value={prioFilter} onChange={e=>setPrioFilter(e.target.value)} style={{width:100,padding:'4px 8px'}}>
            <option value="">Alle Prios</option>{PRIO.map(p=><option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="card">
          <AufgabenTable tasks={filtered}/>
          {filtered.length===0&&<div className="empty">Keine Aufgaben für diesen Filter</div>}
        </div>
      </div>
    )
  }

  // ── Produkte View ─────────────────────────────────────────────────────────────
  function ProdukteView() {
    const [newP, setNewP] = useState({name:'',status:'Idee',lead:'AT',naechster_schritt:'',ziel_vk:0,ziel_ek:0,kategorie:'',offene_fragen:''})
    const [saving, setSaving] = useState(false)
    const save = async () => {
      if(!newP.name) return
      setSaving(true)
      await supabase.from('produkte').insert(newP)
      setNewP({name:'',status:'Idee',lead:'AT',naechster_schritt:'',ziel_vk:0,ziel_ek:0,kategorie:'',offene_fragen:''})
      setSaving(false); load()
    }
    const updateP = async (id: string, field: string, value: string|number) => { await supabase.from('produkte').update({[field]:value}).eq('id',id); load() }
    const delP = async (id: string) => { if(confirm('Produkt löschen?')) { await supabase.from('produkte').delete().eq('id',id); load() } }
    return (
      <div>
        <div className="page-header"><h2>Produkte</h2><p>Pipeline · jedes Produkt braucht Status + Lead + Nächster Schritt</p></div>
        <div className="card" style={{marginBottom:16}}>
          <div className="card-header"><span className="card-title">Neues Produkt</span></div>
          <div className="form-row">
            <div className="form-group"><label>Name</label><input placeholder="z.B. Modular Cap" value={newP.name} onChange={e=>setNewP(p=>({...p,name:e.target.value}))}/></div>
            <div className="form-group"><label>Status</label><select value={newP.status} onChange={e=>setNewP(p=>({...p,status:e.target.value}))}>{STATUS_PRODUKT.map(s=><option key={s}>{s}</option>)}</select></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Lead</label><select value={newP.lead} onChange={e=>setNewP(p=>({...p,lead:e.target.value}))}>{OWNERS.map(o=><option key={o}>{o}</option>)}</select></div>
            <div className="form-group"><label>Kategorie</label><input placeholder="Cap / Patch / Bag..." value={newP.kategorie} onChange={e=>setNewP(p=>({...p,kategorie:e.target.value}))}/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Ziel VK €</label><input type="number" value={newP.ziel_vk} onChange={e=>setNewP(p=>({...p,ziel_vk:+e.target.value}))}/></div>
            <div className="form-group"><label>Ziel EK €</label><input type="number" value={newP.ziel_ek} onChange={e=>setNewP(p=>({...p,ziel_ek:+e.target.value}))}/></div>
          </div>
          <div className="form-group"><label>Nächster Schritt (Pflicht)</label><input placeholder="z.B. Cap Tech Pack finalisieren bis 20.6." value={newP.naechster_schritt} onChange={e=>setNewP(p=>({...p,naechster_schritt:e.target.value}))}/></div>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'…':'Produkt anlegen'}</button>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Kanban Pipeline</span></div>
          <div className="kanban">
            {STATUS_PRODUKT.map(s=>(
              <div className="kanban-col" key={s}>
                <div className="kanban-col-header">{s}</div>
                <div className="kanban-col-body">
                  {produkte.filter(p=>p.status===s).map(p=>(
                    <div className="kanban-card" key={p.id}>
                      <div className="kanban-card-title">{p.name}</div>
                      <div className="kanban-card-meta">
                        <span className={`owner-chip ${ownerChip(p.lead)}`}>{p.lead}</span>
                        {!p.naechster_schritt&&<span style={{fontSize:10,color:'var(--red)'}}>⚠ kein Schritt</span>}
                      </div>
                      {p.ziel_vk>0&&<div style={{fontSize:11,color:'var(--mid)',marginTop:4}}>VK {p.ziel_vk}€ · EK {p.ziel_ek}€ · {p.ziel_vk>0?Math.round((p.ziel_vk-p.ziel_ek)/p.ziel_vk*100):0}%</div>}
                      {p.naechster_schritt&&<div style={{fontSize:11,color:'var(--slate)',marginTop:4,borderTop:'1px solid var(--border)',paddingTop:4}}>→ {p.naechster_schritt.substring(0,60)}</div>}
                      <div style={{display:'flex',gap:4,marginTop:6}}>
                        <select value={p.status} onChange={e=>updateP(p.id,'status',e.target.value)} style={{flex:1,padding:'2px 4px',fontSize:11}}>
                          {STATUS_PRODUKT.map(s=><option key={s}>{s}</option>)}
                        </select>
                        <button className="btn btn-danger btn-sm" style={{padding:'2px 6px'}} onClick={()=>delP(p.id)}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Lieferanten View ──────────────────────────────────────────────────────────
  function LieferantenView() {
    const [filter, setFilter] = useState('alle')
    const filtered = lieferanten.filter(l=>{
      if(filter==='a') return l.bewertung==='A'
      if(filter==='followup') return l.naechster_followup&&l.naechster_followup<=t
      if(filter==='aktiv') return l.status==='Aktiv'
      return true
    })
    return (
      <div>
        <div className="page-header"><h2>Lieferanten</h2><p>Supplier Pipeline · A ohne Follow-up = sofortige Aktion</p></div>
        <div style={{display:'flex',gap:8,marginBottom:16}}>
          <button className="btn btn-primary" onClick={()=>setShowLieferantModal(true)}>+ Neuer Lieferant</button>
          {[['alle','Alle'],['a','A-Supplier'],['followup','Follow-up fällig'],['aktiv','Aktiv']].map(([k,l])=>(
            <button key={k} className={`btn btn-sm ${filter===k?'btn-primary':'btn-outline'}`} onClick={()=>setFilter(k)}>{l}</button>
          ))}
        </div>
        <div className="card">
          <div className="kanban">
            {STATUS_LIEFERANT.map(s=>(
              <div className="kanban-col" key={s}>
                <div className="kanban-col-header">{s}</div>
                <div className="kanban-col-body">
                  {filtered.filter(l=>l.status===s).map(l=>(
                    <div className="kanban-card" key={l.id}>
                      <div className="kanban-card-title">{l.name}</div>
                      <div className="kanban-card-meta">
                        {l.bewertung&&<span className={`badge ${l.bewertung==='A'?'badge-green':l.bewertung==='D'?'badge-red':'badge-gray'}`}>{l.bewertung}</span>}
                        {l.kategorie&&<span className="tag">{l.kategorie}</span>}
                      </div>
                      {l.ansprechpartner&&<div style={{fontSize:11,color:'var(--mid)',marginTop:4}}>{l.ansprechpartner}</div>}
                      {l.naechster_followup&&<div style={{fontSize:11,color:l.naechster_followup<=t?'var(--red)':'var(--green)',marginTop:4}}>Follow-up: {fmt(l.naechster_followup)}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Samples View ──────────────────────────────────────────────────────────────
  function SamplesView() {
    const updateSample = async (id: string, field: string, value: string|number|boolean|null) => { await supabase.from('samples').update({[field]:value}).eq('id',id); load() }
    const delSample = async (id: string) => { if(confirm('Sample löschen?')) { await supabase.from('samples').delete().eq('id',id); load() } }
    return (
      <div>
        <div className="page-header"><h2>Samples</h2><p>Jedes Sample hat einen eigenen Review-Prozess</p></div>
        <div style={{display:'flex',gap:8,marginBottom:16}}>
          <button className="btn btn-primary" onClick={()=>setShowSampleModal(true)}>+ Neues Sample</button>
          <button className="btn btn-signal" onClick={()=>{/* trigger review */}}>Sample Review starten</button>
        </div>
        <div className="card" style={{marginBottom:16}}>
          <div className="card-header"><span className="card-title">Sample Pipeline</span></div>
          <div className="kanban">
            {STATUS_SAMPLE.map(s=>(
              <div className="kanban-col" key={s}>
                <div className="kanban-col-header">{s}</div>
                <div className="kanban-col-body">
                  {samples.filter(sa=>sa.status===s).map(sa=>(
                    <div className="kanban-card" key={sa.id}>
                      <div className="kanban-card-title">{sa.name}</div>
                      <div className="kanban-card-meta">
                        <span className="tag">v{sa.version}</span>
                        {sa.score>0&&<span className={`badge ${sa.score>=8?'badge-green':sa.score>=5?'badge-amber':'badge-red'}`}>{sa.score}/10</span>}
                      </div>
                      {getPName(sa.produkt_id)!=='–'&&<div style={{fontSize:11,color:'var(--mid)',marginTop:4}}>{getPName(sa.produkt_id)}</div>}
                      {getLName(sa.lieferant_id)!=='–'&&<div style={{fontSize:11,color:'var(--mid)'}}>{getLName(sa.lieferant_id)}</div>}
                      {sa.erwartet_am&&<div style={{fontSize:11,color:'var(--mid)',marginTop:2}}>Erwartet: {fmt(sa.erwartet_am)}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Review Room — Alle Samples in Prüfung</span></div>
          {samplesReview.length===0?<div className="empty">Keine Samples in Review</div>:
          <div className="table-wrap"><table>
            <thead><tr><th>Sample</th><th>Produkt</th><th>Version</th><th>Status</th><th>Score</th><th>Was gut</th><th>Was fehlt</th><th>Entscheidung</th><th>Freigabe</th></tr></thead>
            <tbody>{samplesReview.map(s=>(
              <tr key={s.id}>
                <td style={{fontWeight:500}}>{s.name}</td>
                <td style={{fontSize:12}}>{getPName(s.produkt_id)}</td>
                <td><span className="badge badge-gray">v{s.version}</span></td>
                <td><select value={s.status} onChange={e=>updateSample(s.id,'status',e.target.value)} style={{width:130,padding:'3px 6px',fontSize:12}}>{STATUS_SAMPLE.map(st=><option key={st}>{st}</option>)}</select></td>
                <td><input type="number" min={0} max={10} value={s.score||''} onChange={e=>updateSample(s.id,'score',+e.target.value)} style={{width:60}}/></td>
                <td><textarea value={s.review_gut||''} onChange={e=>updateSample(s.id,'review_gut',e.target.value)} style={{width:140,minHeight:50,fontSize:11}} placeholder="Was ist gut?"/></td>
                <td><textarea value={s.review_fehlt||''} onChange={e=>updateSample(s.id,'review_fehlt',e.target.value)} style={{width:140,minHeight:50,fontSize:11}} placeholder="Was fehlt?"/></td>
                <td><textarea value={s.entscheidung||''} onChange={e=>updateSample(s.id,'entscheidung',e.target.value)} style={{width:140,minHeight:50,fontSize:11}} placeholder="Freigabe / Nochmal / Abgelehnt"/></td>
                <td><input type="checkbox" checked={s.freigabe||false} onChange={e=>updateSample(s.id,'freigabe',e.target.checked)}/></td>
              </tr>
            ))}</tbody>
          </table></div>}
        </div>
      </div>
    )
  }

  // ── Content View ──────────────────────────────────────────────────────────────
  function ContentView() {
    const delContent = async (id: string) => { if(confirm('Content löschen?')) { await supabase.from('content').delete().eq('id',id); load() } }
    const updateContent = async (id: string, field: string, value: string) => { await supabase.from('content').update({[field]:value}).eq('id',id); load() }
    return (
      <div>
        <div className="page-header"><h2>Content</h2><p>Content-Kalender · Ideen · Launch-Kommunikation</p></div>
        <button className="btn btn-primary" style={{marginBottom:16}} onClick={()=>setShowContentModal(true)}>+ Neue Content-Idee</button>
        <div className="card">
          <div className="card-header"><span className="card-title">Content Pipeline</span></div>
          <div className="kanban">
            {STATUS_CONTENT.map(s=>(
              <div className="kanban-col" key={s}>
                <div className="kanban-col-header">{s}</div>
                <div className="kanban-col-body">
                  {content.filter(c=>c.status===s).map(c=>(
                    <div className="kanban-card" key={c.id}>
                      <div className="kanban-card-title">{c.titel}</div>
                      <div className="kanban-card-meta">
                        {c.format&&<span className="tag">{c.format}</span>}
                        {c.plattform&&<span className="tag">{c.plattform}</span>}
                        {c.owner&&<span className={`owner-chip ${ownerChip(c.owner)}`}>{c.owner}</span>}
                      </div>
                      {c.veroeffentlichungsdatum&&<div style={{fontSize:11,color:'var(--mid)',marginTop:4}}>📅 {fmt(c.veroeffentlichungsdatum)}</div>}
                      <div style={{marginTop:4}}>
                        <select value={c.status} onChange={e=>updateContent(c.id,'status',e.target.value)} style={{width:'100%',padding:'2px 4px',fontSize:11}}>
                          {STATUS_CONTENT.map(st=><option key={st}>{st}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Finanzen View ─────────────────────────────────────────────────────────────
  function FinanzenView() {
    const total = finanzen.reduce((s,f)=>s+f.betrag_eur,0)
    const bezahlt = finanzen.filter(f=>f.bezahlt).reduce((s,f)=>s+f.betrag_eur,0)
    const offen = total-bezahlt
    const byKat: Record<string,number> = {}
    finanzen.forEach(f=>{ byKat[f.kategorie]=(byKat[f.kategorie]||0)+f.betrag_eur })
    const delF = async (id: string) => { if(confirm('Löschen?')) { await supabase.from('finanzen').delete().eq('id',id); load() } }
    const toggleBez = async (id: string, bez: boolean) => { await supabase.from('finanzen').update({bezahlt:!bez}).eq('id',id); load() }
    return (
      <div>
        <div className="page-header"><h2>Finanzen</h2><p>Jede Ausgabe sofort eintragen · Beleg immer hochladen</p></div>
        <div className="metrics">
          <div className="metric"><div className="metric-label">Gesamt €</div><div className="metric-value">{total.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})}</div></div>
          <div className="metric"><div className="metric-label">Bezahlt €</div><div className="metric-value green">{bezahlt.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})}</div></div>
          <div className="metric"><div className="metric-label">Offen €</div><div className={`metric-value ${offen>0?'red':'green'}`}>{offen.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})}</div></div>
          <div className="metric"><div className="metric-label">Positionen</div><div className="metric-value">{finanzen.length}</div></div>
        </div>
        <button className="btn btn-primary" style={{marginBottom:16}} onClick={()=>setShowFinanzModal(true)}>+ Ausgabe eintragen</button>
        <div className="grid-2" style={{marginBottom:16}}>
          <div className="card">
            <div className="card-header"><span className="card-title">Nach Kategorie</span></div>
            <table style={{width:'100%',fontSize:13,borderCollapse:'collapse'}}>
              <thead><tr><th style={{textAlign:'left',padding:'6px 8px',fontSize:11,color:'var(--mid)',borderBottom:'1px solid var(--border)'}}>Kategorie</th><th style={{textAlign:'right',padding:'6px 8px',fontSize:11,color:'var(--mid)',borderBottom:'1px solid var(--border)'}}>€</th></tr></thead>
              <tbody>{Object.entries(byKat).sort((a,b)=>b[1]-a[1]).map(([k,v])=><tr key={k}><td style={{padding:'6px 8px'}}>{k||'–'}</td><td style={{padding:'6px 8px',textAlign:'right',fontWeight:500}}>{v.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Offene Zahlungen</span></div>
            {finanzen.filter(f=>!f.bezahlt).length===0?<div className="empty">Alle bezahlt ✓</div>:
            <div className="table-wrap"><table><thead><tr><th>Position</th><th>€</th><th>Fällig</th></tr></thead><tbody>
              {finanzen.filter(f=>!f.bezahlt).map(f=><tr key={f.id}><td style={{fontWeight:500}}>{f.position}</td><td style={{color:'var(--red)',fontWeight:600}}>{f.betrag_eur.toFixed(2)}</td><td>{fmt(f.datum)}</td></tr>)}
            </tbody></table></div>}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Alle Ausgaben</span></div>
          <div className="table-wrap"><table>
            <thead><tr><th>Position</th><th>Kat.</th><th>Betrag €</th><th>Datum</th><th>Bezahlt</th><th>Produkt</th><th></th></tr></thead>
            <tbody>{finanzen.map(f=><tr key={f.id}>
              <td style={{fontWeight:500,fontSize:13}}>{f.position}</td>
              <td><span className="tag">{f.kategorie}</span></td>
              <td style={{fontWeight:600}}>{f.betrag_eur.toFixed(2)}</td>
              <td>{fmt(f.datum)}</td>
              <td><input type="checkbox" checked={f.bezahlt} onChange={()=>toggleBez(f.id,f.bezahlt)}/></td>
              <td style={{fontSize:12,color:'var(--mid)'}}>{getPName(f.produkt_id)}</td>
              <td><button className="btn btn-danger btn-sm" onClick={()=>delF(f.id)}>×</button></td>
            </tr>)}</tbody>
          </table></div>
        </div>
      </div>
    )
  }

  // ── Entscheidungen View ───────────────────────────────────────────────────────
  function EntscheidungenView() {
    const delE = async (id: string) => { if(confirm('Löschen?')) { await supabase.from('entscheidungen').delete().eq('id',id); load() } }
    return (
      <div>
        <div className="page-header"><h2>Decision Log</h2><p>Jede Entscheidung wird dokumentiert — Datum · Was · Warum · Wer</p></div>
        <button className="btn btn-primary" style={{marginBottom:16}} onClick={()=>setShowEntscheidungModal(true)}>+ Entscheidung dokumentieren</button>
        <div className="card">
          <div className="table-wrap"><table>
            <thead><tr><th>Entscheidung</th><th>Von</th><th>Datum</th><th>Auswirkung</th><th>Status</th><th>Nächster Schritt</th><th></th></tr></thead>
            <tbody>{entscheidungen.map(e=><tr key={e.id}>
              <td>
                <div style={{fontWeight:500,fontSize:13}}>{e.entscheidung}</div>
                {e.warum&&<div style={{fontSize:11,color:'var(--mid)',marginTop:2}}>Warum: {e.warum}</div>}
              </td>
              <td><span className={`owner-chip ${ownerChip(e.entschieden_von)}`}>{e.entschieden_von}</span></td>
              <td style={{fontSize:12}}>{fmt(e.datum)}</td>
              <td><span className={`badge ${e.auswirkung==='Hoch'?'badge-red':e.auswirkung==='Mittel'?'badge-amber':'badge-gray'}`}>{e.auswirkung}</span></td>
              <td><span className={`badge ${e.status==='Entschieden'?'badge-green':'badge-gray'}`}>{e.status}</span></td>
              <td style={{fontSize:12}}>{e.naechster_schritt||'–'}</td>
              <td><button className="btn btn-danger btn-sm" onClick={()=>delE(e.id)}>×</button></td>
            </tr>)}</tbody>
          </table></div>
          {entscheidungen.length===0&&<div className="empty">Noch keine Entscheidungen — jede Entscheidung hier eintragen</div>}
        </div>
      </div>
    )
  }

  // ── Simple modals for Lieferant / Sample / Content / Finanzen / Entscheidung ─
  function LieferantModal() {
    const [f,setF]=useState({name:'',kategorie:'',status:'Neu',bewertung:'',ansprechpartner:'',email:'',whatsapp:'',naechster_followup:'',notizen:'',moq:0,ek_preis:0,sample_kosten_usd:0,lt_sample_tage:0,lt_bulk_tage:0})
    const save=async()=>{if(!f.name)return;await supabase.from('lieferanten').insert(f);load();setShowLieferantModal(false)}
    return <Modal title="Neuer Lieferant" onClose={()=>setShowLieferantModal(false)}>
      <div className="form-row"><div className="form-group"><label>Name*</label><input value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))}/></div><div className="form-group"><label>Kategorie</label><input placeholder="Cap Factory / Patch..." value={f.kategorie} onChange={e=>setF(p=>({...p,kategorie:e.target.value}))}/></div></div>
      <div className="form-row"><div className="form-group"><label>Status</label><select value={f.status} onChange={e=>setF(p=>({...p,status:e.target.value}))}>{STATUS_LIEFERANT.map(s=><option key={s}>{s}</option>)}</select></div><div className="form-group"><label>Bewertung</label><select value={f.bewertung} onChange={e=>setF(p=>({...p,bewertung:e.target.value}))}><option value="">–</option>{BEWERTUNG.map(b=><option key={b}>{b}</option>)}</select></div></div>
      <div className="form-row"><div className="form-group"><label>Ansprechpartner</label><input value={f.ansprechpartner} onChange={e=>setF(p=>({...p,ansprechpartner:e.target.value}))}/></div><div className="form-group"><label>WhatsApp</label><input value={f.whatsapp} onChange={e=>setF(p=>({...p,whatsapp:e.target.value}))}/></div></div>
      <div className="form-row"><div className="form-group"><label>Nächster Follow-up</label><input type="date" value={f.naechster_followup} onChange={e=>setF(p=>({...p,naechster_followup:e.target.value}))}/></div><div className="form-group"><label>MOQ</label><input type="number" value={f.moq} onChange={e=>setF(p=>({...p,moq:+e.target.value}))}/></div></div>
      <div className="form-row"><div className="form-group"><label>Sample-Kosten USD</label><input type="number" value={f.sample_kosten_usd} onChange={e=>setF(p=>({...p,sample_kosten_usd:+e.target.value}))}/></div><div className="form-group"><label>EK-Preis USD</label><input type="number" value={f.ek_preis} onChange={e=>setF(p=>({...p,ek_preis:+e.target.value}))}/></div></div>
      <div className="form-group"><label>Notizen</label><textarea value={f.notizen} onChange={e=>setF(p=>({...p,notizen:e.target.value}))}/></div>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><button className="btn btn-outline" onClick={()=>setShowLieferantModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={save}>Speichern</button></div>
    </Modal>
  }

  function SampleModal() {
    const [f,setF]=useState({name:'',status:'Angefragt',produkt_id:'' as string|null,lieferant_id:'' as string|null,version:1,angefragt_am:today(),erwartet_am:'',kosten_usd:0,tracking_nr:''})
    const save=async()=>{if(!f.name)return;await supabase.from('samples').insert({...f,produkt_id:f.produkt_id||null,lieferant_id:f.lieferant_id||null});load();setShowSampleModal(false)}
    return <Modal title="Neues Sample" onClose={()=>setShowSampleModal(false)}>
      <div className="form-group"><label>Sample-Name* (Format: Produkt v1 · Lieferant)</label><input placeholder="z.B. Cap v1 · CNCAPS" value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))}/></div>
      <div className="form-row"><div className="form-group"><label>Produkt</label><select value={f.produkt_id||''} onChange={e=>setF(p=>({...p,produkt_id:e.target.value||null}))}><option value="">–</option>{produkte.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div><div className="form-group"><label>Lieferant</label><select value={f.lieferant_id||''} onChange={e=>setF(p=>({...p,lieferant_id:e.target.value||null}))}><option value="">–</option>{lieferanten.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div></div>
      <div className="form-row"><div className="form-group"><label>Version</label><input type="number" value={f.version} onChange={e=>setF(p=>({...p,version:+e.target.value}))}/></div><div className="form-group"><label>Status</label><select value={f.status} onChange={e=>setF(p=>({...p,status:e.target.value}))}>{STATUS_SAMPLE.map(s=><option key={s}>{s}</option>)}</select></div></div>
      <div className="form-row"><div className="form-group"><label>Angefragt am</label><input type="date" value={f.angefragt_am} onChange={e=>setF(p=>({...p,angefragt_am:e.target.value}))}/></div><div className="form-group"><label>Erwartet am</label><input type="date" value={f.erwartet_am} onChange={e=>setF(p=>({...p,erwartet_am:e.target.value}))}/></div></div>
      <div className="form-row"><div className="form-group"><label>Kosten USD</label><input type="number" value={f.kosten_usd} onChange={e=>setF(p=>({...p,kosten_usd:+e.target.value}))}/></div><div className="form-group"><label>Tracking-Nr</label><input value={f.tracking_nr} onChange={e=>setF(p=>({...p,tracking_nr:e.target.value}))}/></div></div>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><button className="btn btn-outline" onClick={()=>setShowSampleModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={save}>Speichern</button></div>
    </Modal>
  }

  function ContentModal() {
    const [f,setF]=useState({titel:'',status:'Idee',format:'',plattform:'',owner:currentOwner,veroeffentlichungsdatum:'',produkt_id:'' as string|null,caption:'',visual_idee:''})
    const save=async()=>{if(!f.titel)return;await supabase.from('content').insert({...f,produkt_id:f.produkt_id||null,veroeffentlichungsdatum:f.veroeffentlichungsdatum||null});load();setShowContentModal(false)}
    return <Modal title="Neue Content-Idee" onClose={()=>setShowContentModal(false)}>
      <div className="form-group"><label>Titel / Hook*</label><input placeholder="Die ersten 2 Sekunden. Schwach = wird nicht gedreht." value={f.titel} onChange={e=>setF(p=>({...p,titel:e.target.value}))}/></div>
      <div className="form-row"><div className="form-group"><label>Format</label><input placeholder="Reel / TikTok / Story..." value={f.format} onChange={e=>setF(p=>({...p,format:e.target.value}))}/></div><div className="form-group"><label>Plattform</label><input placeholder="Instagram / TikTok..." value={f.plattform} onChange={e=>setF(p=>({...p,plattform:e.target.value}))}/></div></div>
      <div className="form-row"><div className="form-group"><label>Owner</label><select value={f.owner} onChange={e=>setF(p=>({...p,owner:e.target.value}))}>{OWNERS.map(o=><option key={o}>{o}</option>)}</select></div><div className="form-group"><label>Veröffentlichungsdatum</label><input type="date" value={f.veroeffentlichungsdatum} onChange={e=>setF(p=>({...p,veroeffentlichungsdatum:e.target.value}))}/></div></div>
      <div className="form-group"><label>Produkt</label><select value={f.produkt_id||''} onChange={e=>setF(p=>({...p,produkt_id:e.target.value||null}))}><option value="">–</option>{produkte.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div className="form-group"><label>Visual-Idee</label><textarea placeholder="Was ist genau zu sehen?" value={f.visual_idee} onChange={e=>setF(p=>({...p,visual_idee:e.target.value}))}/></div>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><button className="btn btn-outline" onClick={()=>setShowContentModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={save}>Speichern</button></div>
    </Modal>
  }

  function FinanzModal() {
    const [f,setF]=useState({position:'',kategorie:'',betrag_eur:0,waehrung:'EUR',bezahlt:false,datum:today(),produkt_id:'' as string|null,lieferant_id:'' as string|null,kommentar:''})
    const save=async()=>{if(!f.position)return;await supabase.from('finanzen').insert({...f,produkt_id:f.produkt_id||null,lieferant_id:f.lieferant_id||null});load();setShowFinanzModal(false)}
    return <Modal title="Ausgabe eintragen" onClose={()=>setShowFinanzModal(false)}>
      <div className="form-group"><label>Position*</label><input placeholder="Was wurde bezahlt?" value={f.position} onChange={e=>setF(p=>({...p,position:e.target.value}))}/></div>
      <div className="form-row"><div className="form-group"><label>Kategorie</label><select value={f.kategorie} onChange={e=>setF(p=>({...p,kategorie:e.target.value}))}><option value="">–</option>{KAT_FINANZEN.map(k=><option key={k}>{k}</option>)}</select></div><div className="form-group"><label>Betrag €</label><input type="number" step="0.01" value={f.betrag_eur} onChange={e=>setF(p=>({...p,betrag_eur:+e.target.value}))}/></div></div>
      <div className="form-row"><div className="form-group"><label>Datum</label><input type="date" value={f.datum} onChange={e=>setF(p=>({...p,datum:e.target.value}))}/></div><div className="form-group"><label>Produkt</label><select value={f.produkt_id||''} onChange={e=>setF(p=>({...p,produkt_id:e.target.value||null}))}><option value="">–</option>{produkte.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div></div>
      <div className="form-row"><div className="form-group"><label>Lieferant</label><select value={f.lieferant_id||''} onChange={e=>setF(p=>({...p,lieferant_id:e.target.value||null}))}><option value="">–</option>{lieferanten.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div><div className="form-group" style={{display:'flex',alignItems:'center',gap:8,paddingTop:20}}><input type="checkbox" checked={f.bezahlt} onChange={e=>setF(p=>({...p,bezahlt:e.target.checked}))}/><label style={{margin:0}}>Bereits bezahlt</label></div></div>
      <div className="form-group"><label>Kommentar</label><textarea value={f.kommentar} onChange={e=>setF(p=>({...p,kommentar:e.target.value}))}/></div>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><button className="btn btn-outline" onClick={()=>setShowFinanzModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={save}>Speichern</button></div>
    </Modal>
  }

  function EntscheidungModal() {
    const [f,setF]=useState({entscheidung:'',warum:'',optionen:'',entschieden_von:currentOwner,datum:today(),auswirkung:'Mittel',status:'Entschieden',naechster_schritt:'',produkt_id:'' as string|null})
    const save=async()=>{if(!f.entscheidung)return;await supabase.from('entscheidungen').insert({...f,produkt_id:f.produkt_id||null});load();setShowEntscheidungModal(false)}
    return <Modal title="Entscheidung dokumentieren" onClose={()=>setShowEntscheidungModal(false)}>
      <div className="form-group"><label>Entscheidung* — In einem Satz: Was wurde entschieden?</label><input placeholder="z.B. Snap-Abstand wird auf 55mm C-t-C festgelegt" value={f.entscheidung} onChange={e=>setF(p=>({...p,entscheidung:e.target.value}))}/></div>
      <div className="form-group"><label>Warum — Was hat den Ausschlag gegeben?</label><textarea value={f.warum} onChange={e=>setF(p=>({...p,warum:e.target.value}))}/></div>
      <div className="form-group"><label>Optionen geprüft</label><textarea placeholder="Welche Alternativen gab es?" value={f.optionen} onChange={e=>setF(p=>({...p,optionen:e.target.value}))}/></div>
      <div className="form-row"><div className="form-group"><label>Entschieden von</label><select value={f.entschieden_von} onChange={e=>setF(p=>({...p,entschieden_von:e.target.value}))}>{OWNERS.map(o=><option key={o}>{o}</option>)}</select></div><div className="form-group"><label>Auswirkung</label><select value={f.auswirkung} onChange={e=>setF(p=>({...p,auswirkung:e.target.value}))}>{['Hoch','Mittel','Niedrig'].map(a=><option key={a}>{a}</option>)}</select></div></div>
      <div className="form-row"><div className="form-group"><label>Datum</label><input type="date" value={f.datum} onChange={e=>setF(p=>({...p,datum:e.target.value}))}/></div><div className="form-group"><label>Produkt</label><select value={f.produkt_id||''} onChange={e=>setF(p=>({...p,produkt_id:e.target.value||null}))}><option value="">–</option>{produkte.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div></div>
      <div className="form-group"><label>Nächster Schritt aus dieser Entscheidung</label><input placeholder="Was folgt? Als Aufgabe anlegen." value={f.naechster_schritt} onChange={e=>setF(p=>({...p,naechster_schritt:e.target.value}))}/></div>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><button className="btn btn-outline" onClick={()=>setShowEntscheidungModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={save}>Speichern</button></div>
    </Modal>
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>QUADRAS</h1>
          <p>Founder OS · v3</p>
        </div>
        <div className="sidebar-user">
          <label style={{color:'rgba(255,255,255,0.4)',fontSize:11,marginBottom:4,display:'block'}}>Aktive Person</label>
          <select value={currentOwner} onChange={e=>setCurrentOwner(e.target.value)}>
            {OWNERS.map(o=><option key={o}>{o}</option>)}
          </select>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">Cockpit</div>
          {navItems.slice(0,1).map(n=><div key={n.id} className={`nav-item ${view===n.id?'active':''}`} onClick={()=>setView(n.id)}>{n.label}</div>)}
          <div className="nav-section">Personal</div>
          {navItems.slice(1,4).map(n=><div key={n.id} className={`nav-item ${view===n.id?'active':''}`} onClick={()=>setView(n.id)}>{n.label}</div>)}
          <div className="nav-section">Daten</div>
          {navItems.slice(4).map(n=><div key={n.id} className={`nav-item ${view===n.id?'active':''}`} onClick={()=>setView(n.id)}>{n.label}</div>)}
        </nav>
      </aside>

      <main className="main">
        {view==='hq'&&<HQView/>}
        {view==='board-at'&&<PersonalBoard owner="AT"/>}
        {view==='board-op'&&<PersonalBoard owner="OP"/>}
        {view==='board-dc'&&<PersonalBoard owner="DC"/>}
        {view==='aufgaben'&&<AufgabenView/>}
        {view==='produkte'&&<ProdukteView/>}
        {view==='lieferanten'&&<LieferantenView/>}
        {view==='samples'&&<SamplesView/>}
        {view==='content'&&<ContentView/>}
        {view==='finanzen'&&<FinanzenView/>}
        {view==='entscheidungen'&&<EntscheidungenView/>}
      </main>

      {showAufgabeModal&&(
        <Modal title={editAufgabe?.id?'Aufgabe bearbeiten':'Neue Aufgabe'} onClose={()=>{setShowAufgabeModal(false);setEditAufgabe(null)}}>
          <AufgabeForm initial={editAufgabe||undefined} produkte={produkte} lieferanten={lieferanten} currentOwner={currentOwner} onSave={load} onClose={()=>{setShowAufgabeModal(false);setEditAufgabe(null)}}/>
        </Modal>
      )}
      {showLieferantModal&&<LieferantModal/>}
      {showSampleModal&&<SampleModal/>}
      {showContentModal&&<ContentModal/>}
      {showFinanzModal&&<FinanzModal/>}
      {showEntscheidungModal&&<EntscheidungModal/>}
    </div>
  )
}

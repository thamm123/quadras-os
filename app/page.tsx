'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  supabase, PERSONEN, PROJEKTE, PRIOS, STATUSES,
  DESIGN_KATS, DESIGN_STATUS, FREIGABE_STATUS, PERSON_HEX,
  Aufgabe, Entscheidung, Datei, DesignIdee, Comment, FeedbackEntry, Notification,
  todayStr, in7dStr, isOverdue, isSoon, safeDate, fmtDate,
  logActivity, notifyAll, type PersonName
} from '../lib/supabase'

type View = 'heute'|'plan'|'aufgaben'|'design'|'dateien'|'entscheidungen'
type Toast = { id:number; msg:string; type:'default'|'success'|'error' }
type ActivityEntry = { id:string; entity_type:string; entity_titel:string; action:string; person:string; created_at:string }
type Risiko = { id:string; titel:string; wahrscheinlichkeit:string; impact:string; gegenmasnahme:string; owner:string; status:string; created_at:string }
let toastId = 0

const Ico = {
  heute:  <svg className="nav-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>,
  plan:   <svg className="nav-svg" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
  aufg:   <svg className="nav-svg" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  design: <svg className="nav-svg" viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>,
  files:  <svg className="nav-svg" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
  decide: <svg className="nav-svg" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  check:  <svg style={{width:9,height:9}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x:      <svg style={{width:11,height:11}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  edit:   <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash:  <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
  plus:   <svg style={{width:14,height:14}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  file:   <svg style={{width:17,height:17}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
  img:    <svg style={{width:17,height:17}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  menu:   <svg style={{width:18,height:18}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  empty:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 15s1.5-2 4-2 4 2 4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
}

// ── Login Screen ─────────────────────────────────────────────────────────
function LoginScreen({onLogin}:{onLogin:(name:PersonName)=>void}) {
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')

  const login=async()=>{
    if(!email.trim()||!password.trim()){setError('Bitte E-Mail und Passwort eingeben');return}
    setLoading(true); setError('')
    const {data,error:err}=await supabase.auth.signInWithPassword({email:email.trim(),password})
    if(err){setError('Falsches E-Mail oder Passwort');setLoading(false);return}
    // Map email to person name
    const emailLower=email.toLowerCase()
    const person:PersonName=
      emailLower.includes('anna-sophie')||emailLower.includes('anna')?'Anna':
      emailLower.includes('norman')?'Norman':
      emailLower.includes('support')||emailLower.includes('alexander')?'Alexander':'Alexander'
    onLogin(person)
    setLoading(false)
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',padding:'var(--sp5)'}}>
      <div style={{width:'100%',maxWidth:380}}>
        <div style={{textAlign:'center',marginBottom:'var(--sp8)'}}>
          <div style={{fontFamily:'var(--font-display)',fontSize:'22px',fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',color:'var(--ink)',marginBottom:'var(--sp1)'}}>QUADRAS</div>
          <div style={{fontSize:'11px',color:'var(--muted)',letterSpacing:'0.1em',textTransform:'uppercase',fontWeight:500}}>Founder Operating System</div>
        </div>
        <div style={{background:'var(--surface)',borderRadius:'var(--r-xl)',border:'1px solid var(--border)',boxShadow:'var(--sh-md)',padding:'var(--sp6)'}}>
          <div style={{fontSize:'var(--text-lg)',fontWeight:700,color:'var(--ink)',marginBottom:'var(--sp5)'}}>Anmelden</div>
          {error&&<div style={{background:'var(--red-bg)',color:'var(--red)',padding:'var(--sp2) var(--sp3)',borderRadius:'var(--r-sm)',fontSize:'var(--text-sm)',marginBottom:'var(--sp4)',fontWeight:500}}>{error}</div>}
          <div style={{marginBottom:'var(--sp3)'}}>
            <label style={{display:'block',fontSize:'var(--text-xs)',fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'var(--sp1)'}}>E-Mail</label>
            <input autoFocus className="form-input" type="email" placeholder="alexander@qua-dras.com" value={email}
              onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()}/>
          </div>
          <div style={{marginBottom:'var(--sp5)'}}>
            <label style={{display:'block',fontSize:'var(--text-xs)',fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'var(--sp1)'}}>Passwort</label>
            <input className="form-input" type="password" placeholder="••••••••" value={password}
              onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()}/>
          </div>
          <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:'var(--sp3)',gap:8}}
            onClick={login} disabled={loading}>
            {loading&&<svg style={{width:16,height:16,animation:'spin 0.8s linear infinite'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>}
            {loading?'Anmelden…':'Anmelden'}
          </button>
        </div>
        <div style={{textAlign:'center',marginTop:'var(--sp4)',fontSize:'var(--text-xs)',color:'var(--muted)'}}>
          Nur für das QUADRAS Team
        </div>
      </div>
    </div>
  )
}

// ── Module-level constants ────────────────────────────────────────────────
const DEFAULT_READINESS=[
  {id:'produkt',    label:'Produkt freigegeben'},
  {id:'bulk',       label:'Bulk-Order ausgelöst'},
  {id:'packaging',  label:'Packaging bestellt'},
  {id:'shopify',    label:'Shopify live'},
  {id:'checkout',   label:'Checkout getestet'},
  {id:'rechtlich',  label:'AGB & Impressum live'},
  {id:'fotos',      label:'Produktfotos fertig'},
  {id:'newsletter', label:'Newsletter aktiv'},
  {id:'content',    label:'Launch-Content bereit'},
  {id:'support',    label:'Support & Retouren bereit'},
]
const DEFAULT_BRAND=[
  {id:'website_premium',  label:'Website wirkt premium'},
  {id:'texte_quadras',    label:'Produkttexte klingen nach QUADRAS'},
  {id:'packaging_brand',  label:'Packaging wirkt ruhig & hochwertig'},
  {id:'hangtags_brand',   label:'Hangtags passen zur Materialwelt'},
  {id:'foto_sprache',     label:'Fotosprache ist definiert'},
  {id:'social_look',      label:'Social Grid Look ist konsistent'},
  {id:'patch_story',      label:'Patch-System wird verständlich erklärt'},
  {id:'farben_final',     label:'Farben & Typografie sind final'},
  {id:'founder_story',    label:'Founder Edition Story ist klar'},
  {id:'no_cheap_vibes',   label:'Kein Dropshipping-Feeling irgendwo'},
]

export default function App() {
  const [authed,      setAuthed]      = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [view,        setView]        = useState<View>('heute')
  const [cmdOpen,     setCmdOpen]     = useState(false)
  const [cmdQuery,    setCmdQuery]    = useState('')
  const [focusTask,   setFocusTask]   = useState<Aufgabe|null>(null)
  const [aktiv,       setAktiv]       = useState<PersonName>('Alexander')
  const [aufgaben,    setAufgaben]    = useState<Aufgabe[]>([])
  const [entscheid,   setEntscheid]   = useState<Entscheidung[]>([])
  const [dateien,     setDateien]     = useState<Datei[]>([])
  const [ideen,       setIdeen]       = useState<DesignIdee[]>([])
  const [activity,    setActivity]    = useState<ActivityEntry[]>([])
  const [loading,     setLoading]     = useState(true)
  const [toasts,      setToasts]      = useState<Toast[]>([])
  const [modal,       setModal]       = useState<null|'aufgabe'|'entscheidung'|'datei'|'design'|'confirm'>(null)
  const [editA,       setEditA]       = useState<Aufgabe|null>(null)
  const [editD,       setEditD]       = useState<DesignIdee|null>(null)
  const [flyout,      setFlyout]      = useState<Aufgabe|null>(null)
  const [designFlyout,setDesignFlyout]= useState<DesignIdee|null>(null)
  const [confirmCb,   setConfirmCb]   = useState<{msg:string;fn:()=>void}|null>(null)
  const [uploading,   setUploading]   = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [fPerson,setFPerson]=useState('Alle')
  const [fProjekt,setFProjekt]=useState('Alle')
  const [fStatus,setFStatus]=useState('Offen')
  const [fDKat,setFDKat]=useState('Alle')
  const [fDFG,setFDFG]=useState('Alle')
  const [weeklyMission, setWeeklyMission] = useState('')
  const [missionEdit, setMissionEdit] = useState(false)
  const [missionDraft, setMissionDraft] = useState('')
  const [readiness, setReadiness] = useState<Record<string,boolean>>({})
  const [brandReadiness, setBrandReadiness] = useState<Record<string,boolean>>({})
  const [risiken, setRisiken] = useState<Risiko[]>([])
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [lastSeen, setLastSeen] = useState<string>(new Date().toISOString())



  // Load team settings from Supabase (shared across all team members)
  const loadSettings = useCallback(async()=>{
    const [ms, ls, bs, rs] = await Promise.all([
      supabase.from('team_settings').select('*').eq('id','weekly_mission').single(),
      supabase.from('team_settings').select('*').eq('id','launch_readiness').single(),
      supabase.from('team_settings').select('*').eq('id','brand_readiness').single(),
      supabase.from('risiken').select('*').order('created_at',{ascending:false}),
    ])
    if(ms.data?.value?.text) setWeeklyMission(ms.data.value.text)
    if(ls.data?.value) setReadiness(ls.data.value)
    if(bs.data?.value) setBrandReadiness(bs.data.value)
    if(rs.data) setRisiken(rs.data)
    setSettingsLoaded(true)
  },[])

  const loadNotifications = useCallback(async()=>{
    const {data}=await supabase.from('notifications')
      .select('*').or(`fuer.eq.${aktiv},fuer.eq.Alle`)
      .order('created_at',{ascending:false}).limit(30)
    if(data) setNotifications(data)
  },[aktiv])

  useEffect(()=>{ loadSettings() },[loadSettings])

  const toast = useCallback((msg:string,type:Toast['type']='default')=>{
    const id=++toastId; setToasts(t=>[...t,{id,msg,type}])
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3000)
  },[])

  const confirm = useCallback((msg:string,fn:()=>void)=>{ setConfirmCb({msg,fn}); setModal('confirm') },[])

  const loadActivity = useCallback(async()=>{
    const {data}=await supabase.from('activity_log').select('*').order('created_at',{ascending:false}).limit(20)
    if(data) setActivity(data)
  },[])

  const loadAll = useCallback(async()=>{
    const [a,e,d,i]=await Promise.all([
      supabase.from('aufgaben').select('*').order('sortierung').order('created_at'),
      supabase.from('entscheidungen').select('*').order('datum',{ascending:false}),
      supabase.from('dateien').select('*').order('created_at',{ascending:false}),
      supabase.from('design_ideen').select('*').order('created_at',{ascending:false}),
    ])
    if(a.data) setAufgaben(a.data)
    if(e.data) setEntscheid(e.data)
    if(d.data) setDateien(d.data)
    if(i.data) setIdeen(i.data)
    setLoading(false)
    loadActivity()
  },[loadActivity])

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session) {
        const email=session.user.email||''
        const person:PersonName=
          email.includes('anna-sophie')||email.includes('anna')?'Anna':
          email.includes('norman')?'Norman':
          email.includes('support')||email.includes('alexander')?'Alexander':'Alexander'
        setAktiv(person)
        setAuthed(true)
      }
      setAuthChecked(true)
    })
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      setAuthed(!!session)
    })
    return ()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{ if(authed) loadAll() },[loadAll,authed])
  useEffect(()=>{ if(authed) loadSettings() },[loadSettings,authed])
  useEffect(()=>{ if(authed) loadNotifications() },[loadNotifications,authed])

  // Optimised realtime — diff injection
  useEffect(()=>{
    const ch=supabase.channel(`quadras-v8-${Math.random().toString(36).slice(2,8)}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'team_settings'},()=>loadSettings())
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},({new:n})=>{
        const notif=n as Notification
        if(notif.fuer===aktiv||notif.fuer==='Alle') setNotifications(prev=>[notif,...prev])
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'risiken'},()=>{
        supabase.from('risiken').select('*').order('created_at',{ascending:false}).then(({data})=>{if(data)setRisiken(data)})
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'aufgaben'},({new:n})=>{
        setAufgaben(prev=>[n as Aufgabe,...prev])
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'aufgaben'},({new:n})=>{
        const u=n as Aufgabe
        setAufgaben(prev=>prev.map(a=>a.id===u.id?u:a))
        setFlyout(prev=>prev?.id===u.id?u:prev)
      })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'aufgaben'},({old})=>{
        setAufgaben(prev=>prev.filter(a=>a.id!==(old as {id:string}).id))
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'design_ideen'},({new:n})=>{
        setIdeen(prev=>[n as DesignIdee,...prev])
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'design_ideen'},({new:n})=>{
        const u=n as DesignIdee
        setIdeen(prev=>prev.map(i=>i.id===u.id?u:i))
        setDesignFlyout(prev=>prev?.id===u.id?u:prev)
      })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'design_ideen'},({old})=>{
        setIdeen(prev=>prev.filter(i=>i.id!==(old as {id:string}).id))
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'entscheidungen'},()=>{
        supabase.from('entscheidungen').select('*').order('datum',{ascending:false}).then(({data})=>{if(data)setEntscheid(data)})
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'dateien'},()=>{
        supabase.from('dateien').select('*').order('created_at',{ascending:false}).then(({data})=>{if(data)setDateien(data)})
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'activity_log'},()=>{ loadActivity() })
      .subscribe()
    return ()=>{ supabase.removeChannel(ch) }
  },[loadActivity])

  // Keyboard shortcuts
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      const tag=(e.target as HTMLElement).tagName
      if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT') return
      if(e.key==='Escape'){ setModal(null); setFlyout(null); setDesignFlyout(null); setSidebarOpen(false); setCmdOpen(false); setFocusTask(null) }
      if(modal||flyout||designFlyout) return
      if((e.metaKey||e.ctrlKey)&&e.key==='k'){ e.preventDefault(); setCmdOpen(o=>!o); return }
      if(e.key==='n'||e.key==='N'){ setEditA(null); setModal('aufgabe') }
      if(e.key==='h'||e.key==='H') setView('heute')
      if(e.key==='p'||e.key==='P') setView('plan')
      if(e.key==='d'||e.key==='D') setView('design')
    }
    window.addEventListener('keydown',h)
    return ()=>window.removeEventListener('keydown',h)
  },[modal,flyout,designFlyout])

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const toggleStatus=async(a:Aufgabe)=>{
    const next=a.status==='Erledigt'?'Offen':'Erledigt'
    const optimistic:Aufgabe={...a,status:next,completed_at:next==='Erledigt'?new Date().toISOString():null}
    setAufgaben(prev=>prev.map(x=>x.id===a.id?optimistic:x))
    setFlyout(prev=>prev?.id===a.id?optimistic:prev)
    const {error}=await supabase.from('aufgaben').update({status:next,completed_at:next==='Erledigt'?new Date().toISOString():null}).eq('id',a.id)
    if(error){ setAufgaben(prev=>prev.map(x=>x.id===a.id?a:x)); toast('Fehler','error') }
    else await logActivity('aufgabe',a.id,a.titel,next==='Erledigt'?'erledigt':'wieder geöffnet',aktiv)
  }

  const toggleSubtask=async(sub:Aufgabe)=>{
    const next=sub.status==='Erledigt'?'Offen':'Erledigt'
    setAufgaben(prev=>prev.map(x=>x.id===sub.id?{...x,status:next}:x))
    await supabase.from('aufgaben').update({status:next}).eq('id',sub.id)
  }

  const delAufgabe=(a:Aufgabe)=>confirm(`"${a.titel}" löschen?`,async()=>{
    setAufgaben(prev=>prev.filter(x=>x.id!==a.id))
    if(flyout?.id===a.id) setFlyout(null)
    const {error}=await supabase.from('aufgaben').delete().eq('id',a.id)
    if(error){ loadAll(); toast('Fehler','error') }
    else{ await logActivity('aufgabe',a.id,a.titel,'gelöscht',aktiv); toast('Gelöscht') }
  })

  const delEntscheid=(e:Entscheidung)=>confirm('Entscheidung löschen?',async()=>{
    setEntscheid(prev=>prev.filter(x=>x.id!==e.id))
    await supabase.from('entscheidungen').delete().eq('id',e.id); toast('Gelöscht')
  })

  const delDatei=(d:Datei)=>confirm(`"${d.name}" löschen?`,async()=>{
    setDateien(prev=>prev.filter(x=>x.id!==d.id))
    await supabase.storage.from('dateien').remove([d.dateiname])
    await supabase.from('dateien').delete().eq('id',d.id); toast('Gelöscht')
  })

  const delIdee=(i:DesignIdee)=>confirm('Idee löschen?',async()=>{
    setIdeen(prev=>prev.filter(x=>x.id!==i.id))
    if(designFlyout?.id===i.id) setDesignFlyout(null)
    if(i.dateiname) await supabase.storage.from('design').remove([i.dateiname])
    await supabase.from('design_ideen').delete().eq('id',i.id); toast('Gelöscht')
  })

  const updateFreigabe=async(idee:DesignIdee,status:string)=>{
    const u={...idee,freigabe:status}
    setIdeen(prev=>prev.map(i=>i.id===idee.id?u:i))
    setDesignFlyout(prev=>prev?.id===idee.id?u:prev)
    await supabase.from('design_ideen').update({freigabe:status}).eq('id',idee.id)
    await logActivity('design',idee.id,idee.titel,`Freigabe: ${status}`,aktiv)
    toast(status,status==='Freigegeben'?'success':'default')
  }

  const addFeedback=async(idee:DesignIdee,text:string)=>{
    const entry:FeedbackEntry={person:aktiv,text,datum:new Date().toISOString()}
    const updated=[...(idee.feedback_json||[]),entry]
    const u={...idee,feedback_json:updated}
    setIdeen(prev=>prev.map(i=>i.id===idee.id?u:i))
    setDesignFlyout(prev=>prev?.id===idee.id?u:prev)
    await supabase.from('design_ideen').update({feedback_json:updated}).eq('id',idee.id)
    toast('Feedback gespeichert','success')
  }

  const handleUpload=async(file:File,bucket:string)=>{
    setUploading(true)
    const fname=`${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
    const {error}=await supabase.storage.from(bucket).upload(fname,file)
    if(error){ toast('Upload fehlgeschlagen','error'); setUploading(false); return null }
    const {data}=supabase.storage.from(bucket).getPublicUrl(fname)
    setUploading(false); return {fname,url:data.publicUrl}
  }

  // Computed
  const t=todayStr(); const h7=in7dStr()
  const kritisch=aufgaben.filter(a=>(isOverdue(a.deadline,a.status)||isSoon(a.deadline,a.status))&&a.status!=='Erledigt')
  const meineOffen=aufgaben.filter(a=>(a.personen||[a.person]).includes(aktiv)&&a.status!=='Erledigt').length
  const offenGesamt=aufgaben.filter(a=>a.status!=='Erledigt').length
  const ueberfaellig=aufgaben.filter(a=>isOverdue(a.deadline,a.status)).length
  const meineFokus=aufgaben.filter(a=>(a.personen||[a.person]).includes(aktiv)&&a.status!=='Erledigt'&&!a.parent_id)
    .sort((a,b)=>({Hoch:0,Normal:1,Niedrig:2}[a.prioritaet as 'Hoch'|'Normal'|'Niedrig']??1)-({Hoch:0,Normal:1,Niedrig:2}[b.prioritaet as 'Hoch'|'Normal'|'Niedrig']??1))
    .slice(0,3)
  const hauptaufgaben=aufgaben.filter(a=>a.ist_hauptaufgabe)
  const phasen=[...new Set(hauptaufgaben.map(a=>a.phase))].sort()
  const meineGesamt=aufgaben.filter(a=>a.person===aktiv).length
  const meineDone=aufgaben.filter(a=>a.person===aktiv&&a.status==='Erledigt').length
  const donePct=meineGesamt>0?Math.round(meineDone/meineGesamt*100):0
  const weekDays=Array.from({length:14},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i);return d.toISOString().split('T')[0]})
  const gefiltert=aufgaben.filter(a=>{
    if(fPerson!=='Alle'&&!(a.personen||[a.person]).includes(fPerson)) return false
    if(fProjekt!=='Alle'&&a.projekt!==fProjekt) return false
    if(fStatus!=='Alle'&&a.status!==fStatus) return false
    return true
  })
  const gefilterteIdeen=ideen.filter(i=>{
    if(fDKat!=='Alle'&&i.kategorie!==fDKat) return false
    if(fDFG!=='Alle'&&i.freigabe!==fDFG) return false
    return true
  })

  // Area status
  const areaStats=PROJEKTE.map(proj=>{
    const items=aufgaben.filter(a=>a.projekt===proj)
    const offen=items.filter(a=>a.status!=='Erledigt').length
    const krit=items.filter(a=>(isOverdue(a.deadline,a.status)||isSoon(a.deadline,a.status))&&a.status!=='Erledigt').length
    const done=items.filter(a=>a.status==='Erledigt').length
    const total=items.length
    return {proj,offen,krit,done,total}
  }).filter(a=>a.total>0).sort((a,b)=>b.krit-a.krit||b.offen-a.offen)

  // ── AufgabeItem — cleaner typography ──────────────────────────────────────
  function AItem({a,editable=false}:{a:Aufgabe;editable?:boolean}) {
    const ov=isOverdue(a.deadline,a.status)
    const sn=isSoon(a.deadline,a.status)
    const metaParts=[a.person,a.projekt,a.deadline?fmtDate(a.deadline):''].filter(Boolean)
    return (
      <div className={`aufgabe${a.status==='Erledigt'?' done':''}${ov?' critical':''}`} style={{borderLeft:`2px solid ${a.status==='Erledigt'?'var(--signal)':a.status==='In Arbeit'?'var(--amber)':ov?'var(--red)':'transparent'}`}}>
        <button className={`check-btn${a.status==='Erledigt'?' done':a.status==='In Arbeit'?' inarbeit':''}`}
          onClick={()=>toggleStatus(a)} title={a.status==='Erledigt'?'Wieder öffnen':'Erledigt'}>
          {a.status==='Erledigt'&&Ico.check}
          {/* FIX: correct class name, no dot in className */}
          {a.status==='In Arbeit'&&<div className="check-btn-inarbeit-dot"/>}
        </button>
        <div className="a-body">
          {a.nummer&&<div className="a-num">{String(a.nummer).padStart(2,'0')}</div>}
          <div className={`a-titel${ov?' overdue':''}`} onClick={()=>setFlyout(a)}>{a.titel}</div>
          {/* Cleaner: single meta line instead of multiple tags */}
          <div className="a-meta-line">
            {ov&&<span style={{color:'var(--red)',fontWeight:700}}>Überfällig</span>}
            {!ov&&sn&&<span style={{color:'var(--amber)',fontWeight:700}}>Bald fällig</span>}
            {(ov||sn)&&<span className="a-meta-dot"/>}
            {metaParts.map((p,i)=>(
              <span key={i}>
                {i>0&&<span className="a-meta-dot"/>}
                <span style={i===0?{color:PERSON_HEX[p]||'var(--mid)',fontWeight:600}:{}}>{p}</span>
              </span>
            ))}
            {a.prioritaet==='Hoch'&&<><span className="a-meta-dot"/><span style={{color:'var(--red)',fontWeight:600}}>Hoch</span></>}
          </div>
          {a.blocker&&<div className="a-blocker">Blocker: {a.blocker}</div>}
        </div>
        {editable&&(
          <div className="a-actions">
            {a.status==='Offen'&&<button className="icon-btn" title="In Arbeit setzen" style={{fontSize:10,fontFamily:'var(--font-mono)',width:'auto',padding:'0 6px',color:'var(--amber)'}} onClick={async()=>{setAufgaben(prev=>prev.map(x=>x.id===a.id?{...x,status:'In Arbeit'}:x));await supabase.from('aufgaben').update({status:'In Arbeit'}).eq('id',a.id)}}>▶</button>}
            <button className="icon-btn" onClick={()=>{setEditA(a);setModal('aufgabe')}}>{Ico.edit}</button>
            <button className="icon-btn del" onClick={()=>delAufgabe(a)}>{Ico.trash}</button>
          </div>
        )}
      </div>
  )
}

  function SkeletonList({rows=4}:{rows?:number}) {
    return <>{Array.from({length:rows}).map((_,i)=>(
      <div key={i} className="skeleton-card"><div className="skeleton skeleton-title"/><div className="skeleton skeleton-meta"/></div>
    ))}</>
  }

  // ── Task Flyout with subtasks ──────────────────────────────────────────────
  function TaskFlyout() {
    const a=flyout!
    const subtasks=aufgaben.filter(x=>x.parent_id===a.id)
    const [comments,setComments]=useState<Comment[]>([])
    const [newComment,setNewComment]=useState('')
    const [newSubtask,setNewSubtask]=useState('')
    const [loadingCom,setLoadingCom]=useState(true)
    const [addingSub,setAddingSub]=useState(false)

    useEffect(()=>{
      supabase.from('aufgabe_comments').select('*').eq('aufgabe_id',a.id).order('created_at').then(({data})=>{
        if(data) setComments(data); setLoadingCom(false)
      })
    },[a.id])

    const [commentFile, setCommentFile] = useState<File|null>(null)
    const commentFileRef = useRef<HTMLInputElement>(null)

    const addComment=async()=>{
      if(!newComment.trim()&&!commentFile) return
      let anhang_url='', anhang_name='', anhang_typ=''
      if(commentFile){
        const fname=`${Date.now()}_${commentFile.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
        const {error}=await supabase.storage.from('kommentar-anhaenge').upload(fname,commentFile)
        if(!error){
          const {data}=supabase.storage.from('kommentar-anhaenge').getPublicUrl(fname)
          anhang_url=data.publicUrl; anhang_name=commentFile.name
          anhang_typ=commentFile.type.startsWith('image/')?'bild':'datei'
        }
        setCommentFile(null)
      }
      const payload={aufgabe_id:a.id,person:aktiv,kommentar:newComment.trim(),anhang_url,anhang_name,anhang_typ}
      setComments(prev=>[...prev,{...payload,id:'tmp-'+Date.now(),created_at:new Date().toISOString()}])
      setNewComment('')
      await supabase.from('aufgabe_comments').insert(payload)
      // Notifications
      await notifyAll(aktiv,'kommentar',a.titel,`${aktiv}: ${newComment.trim().substring(0,60)}${a.deadline?' · fällig '+fmtDate(a.deadline):''}`,a.id,'aufgabe')
      // @mention detection
      const mentions=newComment.match(/@(Alexander|Norman|Anna)/g)||[]
      for(const m of mentions){
        const name=m.slice(1) as PersonName
        if(name!==aktiv){
          await supabase.from('notifications').insert({fuer:name,von:aktiv,typ:'mention',titel:a.titel,nachricht:`${aktiv} hat dich erwähnt: ${newComment.trim().substring(0,80)}`,entity_id:a.id,entity_typ:'aufgabe'})
        }
      }
      await logActivity('aufgabe',a.id,a.titel,'kommentiert',aktiv)
    }

    const addSubtask=async()=>{
      if(!newSubtask.trim()||addingSub) return
      setAddingSub(true)
      await supabase.from('aufgaben').insert({
        titel:newSubtask.trim(),person:aktiv,projekt:a.projekt,
        prioritaet:'Normal',status:'Offen',parent_id:a.id,
        ergebnis:'',beschreibung:'',phase:'',sortierung:0,ist_hauptaufgabe:false,
        deadline:null,blocker:''
      })
      setNewSubtask(''); setAddingSub(false)
    }

    const changeStatus=async(status:string)=>{
      const upd:Record<string,unknown>={status}
      if(status==='Erledigt') upd.completed_at=new Date().toISOString()
      else upd.completed_at=null
      setFlyout(prev=>prev?{...prev,status}:null)
      setAufgaben(prev=>prev.map(x=>x.id===a.id?{...x,status}:x))
      await supabase.from('aufgaben').update(upd).eq('id',a.id)
    }

    const doneSubs=subtasks.filter(s=>s.status==='Erledigt').length

    return (
      <>
        <div className="flyout-overlay" onClick={()=>setFlyout(null)}/>
        <div className="flyout">
          <div className="flyout-header">
            <div style={{flex:1,minWidth:0}}>
              {a.nummer&&<div className="a-num" style={{marginBottom:'var(--sp1)'}}>AUFGABE {String(a.nummer).padStart(2,'0')}</div>}
              <div style={{fontSize:'var(--text-lg)',fontWeight:700,color:'var(--ink)',lineHeight:1.4,marginBottom:'var(--sp2)'}}>{a.titel}</div>
              <div className="a-meta-line">
                {(a.personen||[a.person]).map((p,i)=><span key={p} style={{color:PERSON_HEX[p]||'var(--mid)',fontWeight:600}}>{i>0&&<span className="a-meta-dot"/>}{p}</span>)}
                <span className="a-meta-dot"/>
                <span>{a.projekt}</span>
                {a.deadline&&<><span className="a-meta-dot"/><span style={{color:isOverdue(a.deadline,a.status)?'var(--red)':isSoon(a.deadline,a.status)?'var(--amber)':'var(--mid)'}}>bis {fmtDate(a.deadline)}</span></>}
                {a.prioritaet==='Hoch'&&<><span className="a-meta-dot"/><span style={{color:'var(--red)',fontWeight:600}}>Hoch</span></>}
              </div>
            </div>
            <button className="icon-btn" onClick={()=>setFlyout(null)}>{Ico.x}</button>
          </div>
          <div className="flyout-body">
            {a.beschreibung&&<div className="flyout-section"><div className="flyout-section-label">Beschreibung</div><div style={{fontSize:'var(--text-base)',color:'var(--slate)',lineHeight:1.6}}>{a.beschreibung}</div></div>}
            <div className="flyout-section">
              <div className="flyout-section-label">Gewünschtes Ergebnis</div>
              <div className="flyout-result">{a.ergebnis||'–'}</div>
            </div>
            {a.blocker&&<div className="flyout-section"><div className="flyout-section-label" style={{color:'var(--red)'}}>Blocker</div><div className="flyout-blocker">{a.blocker}</div></div>}

            {/* Subtasks — the key new feature */}
            <div className="flyout-section">
              <div className="flyout-section-label">
                <span>Unteraufgaben</span>
                {subtasks.length>0&&<span style={{color:'var(--mid)',fontWeight:400}}>{doneSubs}/{subtasks.length}</span>}
              </div>
              {subtasks.length>0&&(
                <div className="card" style={{marginBottom:'var(--sp3)'}}>
                  {subtasks.map(sub=>(
                    <div key={sub.id} className="subtask">
                      <button className={`subtask-check${sub.status==='Erledigt'?' done':''}`} onClick={()=>toggleSubtask(sub)}>
                        {sub.status==='Erledigt'&&<span className="subtask-check-mark">✓</span>}
                      </button>
                      <span className={`subtask-title${sub.status==='Erledigt'?' done':''}`} onClick={()=>setFlyout(sub)}>{sub.titel}</span>
                      <span style={{fontSize:'var(--text-xs)',color:PERSON_HEX[sub.person]||'var(--mid)',fontWeight:600,marginLeft:'auto'}}>{sub.person}</span>
                      <button className="icon-btn del" style={{opacity:0.5,width:20,height:20}} onClick={()=>delAufgabe(sub)}>{Ico.trash}</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{display:'flex',gap:'var(--sp2)'}}>
                <input className="form-input" style={{fontSize:'var(--text-sm)'}} placeholder="+ Unteraufgabe hinzufügen..."
                  value={newSubtask} onChange={e=>setNewSubtask(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addSubtask()}}}/>
                <button className="btn btn-secondary btn-sm" onClick={addSubtask} disabled={addingSub}>+</button>
              </div>
            </div>

            <div className="flyout-section">
              <div className="flyout-section-label">Status</div>
              <div style={{display:'flex',gap:'var(--sp2)',flexWrap:'wrap'}}>
                {STATUSES.map(s=><button key={s} className={`btn btn-sm ${a.status===s?'btn-primary':'btn-secondary'}`} onClick={()=>changeStatus(s)}>{s}</button>)}
              </div>
            </div>

            <div className="flyout-section">
              <div className="flyout-section-label">Kommentare <span style={{color:'var(--muted)',fontWeight:400}}>{comments.length}</span></div>
              {loadingCom?<div className="skeleton skeleton-line"/>:comments.length===0?<div style={{fontSize:'var(--text-sm)',color:'var(--muted)',padding:'var(--sp1) 0'}}>Noch keine Kommentare</div>:
                comments.map(c=>(
                  <div key={c.id} className="comment">
                    <div className="comment-header">
                      <span className="comment-person" style={{color:PERSON_HEX[c.person]||'var(--slate)'}}>{c.person}</span>
                      <span className="comment-time">{new Date(c.created_at).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>
                    </div>
                    <div className="comment-text">
                      {c.kommentar.split(/(@(?:Alexander|Norman|Anna))/g).map((part,i)=>
                        /^@(Alexander|Norman|Anna)$/.test(part)
                          ?<span key={i} style={{color:PERSON_HEX[part.slice(1)]||'var(--signal)',fontWeight:700}}>{part}</span>
                          :<span key={i}>{part}</span>
                      )}
                    </div>
                    {c.anhang_url&&c.anhang_url.startsWith('https://')&&(
                      <div style={{marginTop:'var(--sp2)'}}>
                        {c.anhang_typ==='bild'
                          ?<img src={c.anhang_url} alt={c.anhang_name} style={{maxWidth:'100%',borderRadius:'var(--r-md)',maxHeight:200,objectFit:'cover',cursor:'pointer'}} onClick={()=>window.open(c.anhang_url,'_blank')}/>
                          :<a href={c.anhang_url} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:'var(--text-xs)',color:'var(--signal)',fontWeight:600,textDecoration:'none',padding:'3px 8px',background:'var(--signal-bg)',borderRadius:'var(--r-sm)'}}>
                            {Ico.file} {c.anhang_name}
                          </a>}
                      </div>
                    )}
                  </div>
                ))
              }
              <div style={{marginBottom:'var(--sp2)'}}>
                <div style={{display:'flex',gap:'var(--sp2)',alignItems:'flex-end'}}>
                  <div style={{flex:1}}>
                    <textarea className="form-input" style={{fontSize:'var(--text-sm)',minHeight:60,resize:'none'}}
                      placeholder="Kommentar… @Alexander @Norman @Anna für Mentions"
                      value={newComment} onChange={e=>setNewComment(e.target.value)}
                      onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();addComment()}}}/>
                    {commentFile&&<div style={{fontSize:'var(--text-xs)',color:'var(--signal)',marginTop:3,fontFamily:'var(--font-mono)'}}>📎 {commentFile.name}</div>}
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    <button className="btn btn-secondary btn-sm" onClick={()=>commentFileRef.current?.click()} title="Datei anhängen">📎</button>
                    <button className="btn btn-primary btn-sm" onClick={addComment}>→</button>
                  </div>
                </div>
                <input ref={commentFileRef} type="file" style={{display:'none'}} accept="image/*,.pdf,.doc,.docx,.xlsx,.zip" onChange={e=>setCommentFile(e.target.files?.[0]||null)}/>
              </div>
            </div>
            {/* Übergabe */}
            <div className="flyout-section">
              <div className="flyout-section-label">Übergabe</div>
              <div style={{display:'flex',gap:'var(--sp2)',flexWrap:'wrap'}}>
                {PERSONEN.filter(p=>p.name!==a.person).map(p=>(
                  <button key={p.name} className="btn btn-secondary btn-sm" style={{color:PERSON_HEX[p.name]}}
                    onClick={async()=>{
                      const note=window.prompt(`Übergabe-Notiz für ${p.name} (optional):`)
                      if(note===null) return
                      const upd={person:p.name,personen:[p.name],beschreibung:note?`${a.beschreibung?a.beschreibung+'\n\n':''}Übergabe von ${a.person}: ${note}`:a.beschreibung}
                      setAufgaben(prev=>prev.map(x=>x.id===a.id?{...x,...upd}:x))
                      setFlyout(prev=>prev?{...prev,...upd}:null)
                      await supabase.from('aufgaben').update(upd).eq('id',a.id)
                      await supabase.from('notifications').insert({fuer:p.name,von:aktiv,typ:'zuweisung',titel:a.titel,nachricht:`${aktiv} hat die Aufgabe an dich übergeben${note?' — '+note:''}`,entity_id:a.id,entity_typ:'aufgabe'})
                      await logActivity('aufgabe',a.id,a.titel,`an ${p.name} übergeben`,aktiv)
                    }}>→ {p.name}</button>
                ))}
              </div>
            </div>
            <div className="flyout-actions">
              <button className="btn btn-secondary btn-sm" onClick={()=>{setEditA(a);setModal('aufgabe');setFlyout(null)}}>Bearbeiten</button>
              <button className="btn btn-danger btn-sm" onClick={()=>delAufgabe(a)}>Löschen</button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Design Studio Flyout ───────────────────────────────────────────────────
  function DesignStudioFlyout() {
    const idee=designFlyout!
    const [feedbackText,setFeedbackText]=useState('')
    const fgColor=(s:string)=>s==='Freigegeben'?'var(--signal)':s==='Abgelehnt'?'var(--red)':s==='Überarbeiten'?'var(--amber)':'var(--muted)'
    return (
      <>
        <div className="flyout-overlay" onClick={()=>setDesignFlyout(null)}/>
        <div className="design-flyout">
          <div className="flyout-header">
            <div style={{flex:1,minWidth:0}}>
              {idee.freigabe==='Überarbeiten'&&<div className="badge-overarbeiten" style={{marginBottom:'var(--sp2)'}}>Überarbeiten erforderlich</div>}
              <div style={{fontSize:'var(--text-lg)',fontWeight:700,color:'var(--ink)',marginBottom:'var(--sp1)'}}>{idee.titel}</div>
              <div className="a-meta-line">
                <span>{idee.kategorie}</span><span className="a-meta-dot"/>
                <span style={{color:PERSON_HEX[idee.von]||'var(--mid)',fontWeight:600}}>{idee.von}</span><span className="a-meta-dot"/>
                <span style={{color:fgColor(idee.freigabe),fontWeight:700}}>{idee.freigabe}</span>
              </div>
            </div>
            <button className="icon-btn" onClick={()=>setDesignFlyout(null)}>{Ico.x}</button>
          </div>
          {/* Large preview */}
          <div className="design-flyout-img">
            {idee.url&&idee.url.startsWith('https://')
              ?<img src={idee.url} alt={idee.titel}/>
              :<div className="design-flyout-img-placeholder">{idee.kategorie}</div>}
          </div>
          <div className="design-flyout-body">
            {/* PLM Block */}
            <div className="plm-block" style={{marginBottom:'var(--sp4)'}}>
              <div className="plm-logo">QUADRAS · QOS-{String(ideen.indexOf(idee)+1).padStart(3,'0')}</div>
              <div className="plm-name">{idee.titel}</div>
              <div className="plm-edition">{idee.kategorie} / Edition 01</div>
              <div className="plm-mj-prompt">
                MJ Prompt: {idee.titel} patch design, 65x43mm format, border-radius 4, flat embroidery, --ar 65:43 --v 7.0 --style raw
              </div>
            </div>
            {idee.beschreibung&&(
              <div className="flyout-section"><div className="flyout-section-label">Konzept</div>
                <div style={{fontSize:'var(--text-base)',color:'var(--slate)',lineHeight:1.6}}>{idee.beschreibung}</div>
              </div>
            )}
            {/* Quick approval actions */}
            <div className="flyout-section">
              <div className="flyout-section-label">Freigabe</div>
              <div style={{display:'flex',gap:'var(--sp2)',flexWrap:'wrap'}}>
                <button className="btn btn-signal btn-sm" onClick={()=>updateFreigabe(idee,'Freigegeben')}>Freigeben</button>
                <button className="btn btn-amber btn-sm" onClick={()=>updateFreigabe(idee,'Überarbeiten')}>Überarbeiten</button>
                <button className="btn btn-danger btn-sm" onClick={()=>updateFreigabe(idee,'Abgelehnt')}>Ablehnen</button>
              </div>
            </div>
            {/* Full feedback history */}
            <div className="flyout-section">
              <div className="flyout-section-label">Feedback-Verlauf <span style={{color:'var(--muted)',fontWeight:400}}>{(idee.feedback_json||[]).length}</span></div>
              {(idee.feedback_json||[]).length===0
                ?<div style={{fontSize:'var(--text-sm)',color:'var(--muted)'}}>Noch kein Feedback</div>
                :(idee.feedback_json||[]).map((fb,i)=>(
                  <div key={i} className="design-fb-item">
                    <div className="design-fb-meta">{fb.person} · {new Date(fb.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
                    {fb.text}
                  </div>
                ))}
              <div className="design-fb-input" style={{marginTop:'var(--sp3)'}}>
                <input className="form-input" style={{fontSize:'var(--text-sm)'}} placeholder="Feedback hinzufügen..." value={feedbackText}
                  onChange={e=>setFeedbackText(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'&&feedbackText.trim()){addFeedback(idee,feedbackText);setFeedbackText('')}}}/>
                <button className="btn btn-secondary btn-sm" onClick={()=>{if(feedbackText.trim()){addFeedback(idee,feedbackText);setFeedbackText('')}}}>+</button>
              </div>
            </div>
            <div className="flyout-actions">
              <button className="btn btn-secondary btn-sm" onClick={()=>{setEditD(idee);setModal('design');setDesignFlyout(null)}}>Bearbeiten</button>
              <button className="btn btn-danger btn-sm" onClick={()=>delIdee(idee)}>Löschen</button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Modals ─────────────────────────────────────────────────────────────────
  function AufgabeModal() {
    const isEdit=!!editA?.id
    const [f,setF]=useState({titel:editA?.titel||'',beschreibung:editA?.beschreibung||'',person:editA?.person||aktiv,personen:editA?.personen||[editA?.person||aktiv],projekt:editA?.projekt||PROJEKTE[0],prioritaet:editA?.prioritaet||'Normal',status:editA?.status||'Offen',deadline:editA?.deadline||'',ergebnis:editA?.ergebnis||'',blocker:editA?.blocker||'',nummer:editA?.nummer?.toString()||''})
    const [errors,setErrors]=useState<Record<string,string>>({})
    const [saving,setSaving]=useState(false)
    const up=(k:string,v:string)=>{setF(p=>({...p,[k]:v}));setErrors(e=>({...e,[k]:''})) }
    const validate=()=>{
      const e:Record<string,string>={}
      if(!f.titel.trim()) e.titel='Bitte Aufgabe eingeben'
      if(!f.ergebnis.trim()) e.ergebnis='Gewünschtes Ergebnis ist Pflichtfeld'
      setErrors(e); return Object.keys(e).length===0
    }
    const save=async()=>{
      if(!validate()) return; setSaving(true)
      const data={...f,deadline:safeDate(f.deadline)||null,beschreibung:f.beschreibung||'',blocker:f.blocker||'',nummer:f.nummer?parseInt(f.nummer):null,person:f.personen[0]||aktiv,personen:f.personen}
      if(isEdit){
        const {error}=await supabase.from('aufgaben').update(data).eq('id',editA!.id)
        if(error){toast('Fehler: '+error.message,'error');setSaving(false);return}
        await logActivity('aufgabe',editA!.id,f.titel,'aktualisiert',aktiv)
        await notifyAll(aktiv,'aufgabe_update',f.titel,`${aktiv} hat aktualisiert${f.deadline?' · fällig '+fmtDate(f.deadline):''}`,editA!.id,'aufgabe')
        toast('Aktualisiert','success')
      } else {
        const {data:ins,error}=await supabase.from('aufgaben').insert(data).select().single()
        if(error){toast('Fehler: '+error.message,'error');setSaving(false);return}
        if(ins){
          await logActivity('aufgabe',ins.id,f.titel,'erstellt',aktiv)
          // Notify assigned persons
          for(const p of f.personen.filter(p=>p!==aktiv)){
            await notifyAll(aktiv,'zuweisung',f.titel,`${aktiv} hat dir eine Aufgabe zugewiesen`,ins.id,'aufgabe')
          }
        }
        toast('Erstellt','success')
      }
      setSaving(false);setModal(null);setEditA(null)
    }
    return (
      <div className="overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
        <div className="modal">
          <div className="modal-header"><span className="modal-title">{isEdit?'Aufgabe bearbeiten':'Neue Aufgabe'}</span><button className="modal-close" onClick={()=>setModal(null)}>{Ico.x}</button></div>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group" style={{flex:3}}><label className="form-label">Aufgabe *</label><input autoFocus required className={`form-input${errors.titel?' error':''}`} placeholder="Aktionsverb + konkretes Ziel" value={f.titel} onChange={e=>up('titel',e.target.value)}/>{errors.titel&&<div className="form-error">{errors.titel}</div>}</div>
              <div className="form-group" style={{flex:1}}><label className="form-label">Nummer</label><input className="form-input" type="number" min="1" placeholder="z.B. 01" value={f.nummer} onChange={e=>up('nummer',e.target.value)}/></div>
            </div>
            <div className="form-group"><label className="form-label">Details</label><textarea className="form-input" placeholder="Kontext, Links, Hinweise..." value={f.beschreibung} onChange={e=>up('beschreibung',e.target.value)}/></div>
            <div className="form-group">
              <label className="form-label">Verantwortlich (mehrere möglich)</label>
              <div style={{display:'flex',gap:'var(--sp2)',flexWrap:'wrap'}}>
                {PERSONEN.map(p=>(
                  <button key={p.name} type="button"
                    className={`chip${f.personen.includes(p.name)?' on':''}`}
                    style={f.personen.includes(p.name)?{background:PERSON_HEX[p.name],borderColor:PERSON_HEX[p.name]}:{}}
                    onClick={()=>{
                      const next=f.personen.includes(p.name)
                        ?f.personen.filter(x=>x!==p.name)
                        :[...f.personen,p.name]
                      if(next.length>0) setF(prev=>({...prev,personen:next,person:next[0]}))
                    }}>{p.name}</button>
                ))}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Priorität</label><select className="form-input" value={f.prioritaet} onChange={e=>up('prioritaet',e.target.value)}>{PRIOS.map(p=><option key={p}>{p}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Deadline (optional)</label><input type="date" className={`form-input${errors.deadline?' error':''}`} value={f.deadline} onChange={e=>up('deadline',e.target.value)}/></div>
            </div>
            <div className="form-group"><label className="form-label">Bereich *</label><select required className="form-input" value={f.projekt} onChange={e=>up('projekt',e.target.value)}>{PROJEKTE.map(p=><option key={p}>{p}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Gewünschtes Ergebnis *</label><input required className={`form-input${errors.ergebnis?' error':''}`} placeholder="Wann ist es WIRKLICH erledigt?" value={f.ergebnis} onChange={e=>up('ergebnis',e.target.value)}/>{errors.ergebnis&&<div className="form-error">{errors.ergebnis}</div>}</div>
            <div className="form-group"><label className="form-label">Blocker</label><input className="form-input" placeholder="Was blockiert?" value={f.blocker} onChange={e=>up('blocker',e.target.value)}/></div>
            {isEdit&&<div className="form-group"><label className="form-label">Status</label><select className="form-input" value={f.status} onChange={e=>up('status',e.target.value)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>}
            <div className="form-actions"><button className="btn btn-secondary" onClick={()=>setModal(null)}>Abbrechen</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Speichern…':'Aufgabe speichern'}</button></div>
          </div>
        </div>
      </div>
    )
  }

  function EntscheidungModal() {
    const [f,setF]=useState({titel:'',begruendung:'',person:aktiv,projekt:PROJEKTE[9],datum:todayStr(),naechster_schritt:''})
    const [errors,setErrors]=useState<Record<string,string>>({})
    const [saving,setSaving]=useState(false)
    const save=async()=>{
      if(!f.titel.trim()){setErrors({titel:'Pflichtfeld'});return}; setSaving(true)
      const {error}=await supabase.from('entscheidungen').insert({...f,datum:safeDate(f.datum)||todayStr()})
      if(error){toast('Fehler: '+error.message,'error');setSaving(false);return}
      toast('Dokumentiert','success'); setSaving(false); setModal(null)
    }
    return (
      <div className="overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
        <div className="modal">
          <div className="modal-header"><span className="modal-title">Entscheidung dokumentieren</span><button className="modal-close" onClick={()=>setModal(null)}>{Ico.x}</button></div>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Was wurde entschieden? *</label><input autoFocus className={`form-input${errors.titel?' error':''}`} placeholder="z.B. Snap-Abstand 55mm C-t-C festgelegt" value={f.titel} onChange={e=>setF(p=>({...p,titel:e.target.value}))}/>{errors.titel&&<div className="form-error">{errors.titel}</div>}</div>
            <div className="form-group"><label className="form-label">Warum?</label><textarea className="form-input" value={f.begruendung} onChange={e=>setF(p=>({...p,begruendung:e.target.value}))}/></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Von</label><select className="form-input" value={f.person} onChange={e=>setF(p=>({...p,person:e.target.value}))}>{PERSONEN.map(p=><option key={p.name}>{p.name}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Bereich</label><select className="form-input" value={f.projekt} onChange={e=>setF(p=>({...p,projekt:e.target.value}))}>{PROJEKTE.map(p=><option key={p}>{p}</option>)}</select></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Datum</label><input type="date" className="form-input" value={f.datum} onChange={e=>setF(p=>({...p,datum:e.target.value}))}/></div>
              <div className="form-group"><label className="form-label">Nächster Schritt</label><input className="form-input" value={f.naechster_schritt} onChange={e=>setF(p=>({...p,naechster_schritt:e.target.value}))}/></div>
            </div>
            <div className="form-actions"><button className="btn btn-secondary" onClick={()=>setModal(null)}>Abbrechen</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'…':'Speichern'}</button></div>
          </div>
        </div>
      </div>
    )
  }

  function DateiModal() {
    const [name,setName]=useState(''); const [projekt,setProjekt]=useState(PROJEKTE[0])
    const ref=useRef<HTMLInputElement>(null)
    const upload=async(file:File)=>{
      const res=await handleUpload(file,'dateien'); if(!res) return
      if(!res.url.startsWith('https://')){toast('Ungültige URL','error');return}
      const {error}=await supabase.from('dateien').insert({name:name||file.name,dateiname:res.fname,projekt,hochgeladen_von:aktiv,url:res.url,groesse:file.size})
      if(error){toast('Fehler','error');return}
      toast('Hochgeladen','success'); setModal(null)
    }
    return (
      <div className="overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
        <div className="modal">
          <div className="modal-header"><span className="modal-title">Datei hochladen</span><button className="modal-close" onClick={()=>setModal(null)}>{Ico.x}</button></div>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group"><label className="form-label">Name</label><input className="form-input" placeholder="z.B. Tech Pack Cap v2" value={name} onChange={e=>setName(e.target.value)}/></div>
              <div className="form-group"><label className="form-label">Bereich</label><select className="form-input" value={projekt} onChange={e=>setProjekt(e.target.value)}>{PROJEKTE.map(p=><option key={p}>{p}</option>)}</select></div>
            </div>
            <div className="upload-zone" onClick={()=>ref.current?.click()}>
              <div style={{width:28,height:28,margin:'0 auto var(--sp2)'}}>{Ico.file}</div>
              <div className="upload-zone-title">{uploading?'Wird hochgeladen…':'Datei auswählen'}</div>
              <div className="upload-zone-sub">PDF, Word, Excel, Bilder</div>
              <input ref={ref} type="file" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)upload(f)}}/>
            </div>
            <div className="form-actions"><button className="btn btn-secondary" onClick={()=>setModal(null)}>Schließen</button></div>
          </div>
        </div>
      </div>
    )
  }

  function DesignModal() {
    const isEdit=!!editD?.id
    const [f,setF]=useState({titel:editD?.titel||'',kategorie:editD?.kategorie||'Patch Idee',beschreibung:editD?.beschreibung||'',status:editD?.status||'Idee',von:editD?.von||aktiv,freigabe:editD?.freigabe||'Offen'})
    const [file,setFile]=useState<File|null>(null)
    const [errors,setErrors]=useState<Record<string,string>>({})
    const [saving,setSaving]=useState(false)
    const ref=useRef<HTMLInputElement>(null)
    const save=async()=>{
      if(!f.titel.trim()){setErrors({titel:'Pflichtfeld'});return}; setSaving(true)
      let url=editD?.url||'',dateiname=editD?.dateiname||''
      if(file){const res=await handleUpload(file,'design');if(res&&res.url.startsWith('https://')){url=res.url;dateiname=res.fname}}
      const data={...f,url,dateiname,feedback_json:editD?.feedback_json||[]}
      if(isEdit){await supabase.from('design_ideen').update(data).eq('id',editD!.id);toast('Aktualisiert','success')}
      else{await supabase.from('design_ideen').insert(data);toast('Hinzugefügt','success')}
      setSaving(false);setModal(null);setEditD(null)
    }
    return (
      <div className="overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
        <div className="modal">
          <div className="modal-header"><span className="modal-title">{isEdit?'Idee bearbeiten':'Neue Design-Idee'}</span><button className="modal-close" onClick={()=>setModal(null)}>{Ico.x}</button></div>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Titel *</label><input autoFocus className={`form-input${errors.titel?' error':''}`} placeholder="z.B. SIGNAL Frame — Wellen-Motiv" value={f.titel} onChange={e=>setF(p=>({...p,titel:e.target.value}))}/>{errors.titel&&<div className="form-error">{errors.titel}</div>}</div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Kategorie</label><select className="form-input" value={f.kategorie} onChange={e=>setF(p=>({...p,kategorie:e.target.value}))}>{DESIGN_KATS.map(k=><option key={k}>{k}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Von</label><select className="form-input" value={f.von} onChange={e=>setF(p=>({...p,von:e.target.value}))}>{PERSONEN.map(p=><option key={p.name}>{p.name}</option>)}</select></div>
            </div>
            <div className="form-group"><label className="form-label">Beschreibung</label><textarea className="form-input" value={f.beschreibung} onChange={e=>setF(p=>({...p,beschreibung:e.target.value}))}/></div>
            <div className="form-group">
              <label className="form-label">Bild — 65:43 Seitenverhältnis empfohlen</label>
              <div className="upload-zone" onClick={()=>ref.current?.click()}>
                <div style={{width:24,height:24,margin:'0 auto var(--sp2)'}}>{Ico.img}</div>
                <div className="upload-zone-title">{uploading?'Hochladen…':file?file.name:editD?.url?'Bild vorhanden':'Design-Datei wählen'}</div>
                <div className="upload-zone-sub">JPG, PNG, PDF, AI</div>
                <input ref={ref} type="file" accept="image/*,.pdf" style={{display:'none'}} onChange={e=>setFile(e.target.files?.[0]||null)}/>
              </div>
            </div>
            {isEdit&&<div className="form-row">
              <div className="form-group"><label className="form-label">Status</label><select className="form-input" value={f.status} onChange={e=>setF(p=>({...p,status:e.target.value}))}>{DESIGN_STATUS.map(s=><option key={s}>{s}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Freigabe</label><select className="form-input" value={f.freigabe} onChange={e=>setF(p=>({...p,freigabe:e.target.value}))}>{FREIGABE_STATUS.map(s=><option key={s}>{s}</option>)}</select></div>
            </div>}
            <div className="form-actions"><button className="btn btn-secondary" onClick={()=>setModal(null)}>Abbrechen</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Speichern…':'Idee speichern'}</button></div>
          </div>
        </div>
      </div>
    )
  }

  function ConfirmModal() {
    return (
      <div className="overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
        <div className="modal confirm-modal">
          <div className="modal-header"><span className="modal-title">Bestätigung</span><button className="modal-close" onClick={()=>setModal(null)}>{Ico.x}</button></div>
          <div className="modal-body">
            <div className="confirm-text">{confirmCb?.msg}</div>
            <div className="confirm-acts"><button className="btn btn-secondary" onClick={()=>setModal(null)}>Abbrechen</button><button className="btn btn-danger" onClick={()=>{confirmCb?.fn();setModal(null)}}>Löschen</button></div>
          </div>
        </div>
      </div>
    )
  }

  // ── VIEWS ──────────────────────────────────────────────────────────────────
  function HeuteView() {
    const ap=PERSONEN.find(p=>p.name===aktiv)!

    // Executive summary
    const gesamtPct=hauptaufgaben.length>0?Math.round(hauptaufgaben.filter(a=>a.status==='Erledigt').length/hauptaufgaben.length*100):0
    const launchStatus=ueberfaellig>3||gesamtPct<30?'rot':ueberfaellig>0||gesamtPct<70?'gelb':'gruen'
    const statusColor={'rot':'var(--red)','gelb':'var(--amber)','gruen':'var(--signal)'}[launchStatus]
    const statusText={'rot':'Rot — Sofort handeln','gelb':'Gelb — Im Plan, Risiken vorhanden','gruen':'Grün — Auf Kurs'}[launchStatus]
    const blockerAufgaben=aufgaben.filter(a=>a.blocker&&a.blocker.trim()!==''&&a.status!=='Erledigt')
    const designFeedbackOffen=ideen.filter(i=>i.status==='Feedback ausstehend'||i.freigabe==='Überarbeiten')
    const offeneEntscheidungen=entscheid.slice(0,5)
    const in14dStr=Array.from({length:14},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i);return d.toISOString().split('T')[0]}).pop()!
    const alle7Tage=aufgaben.filter(a=>a.deadline&&a.deadline>=t&&a.deadline<=in14dStr)
    const wipWarn=(name:string)=>{
      const cnt=aufgaben.filter(a=>a.person===name&&a.status!=='Erledigt'&&!a.parent_id).length
      return cnt>=6?'rot':cnt>=4?'gelb':null
    }
    const BRAND_ITEMS=DEFAULT_BRAND.map(i=>({...i,label:brandReadiness['label_'+i.id]||i.label}))
    const brandDone=BRAND_ITEMS.filter(i=>brandReadiness[i.id]).length
    const brandPct=Math.round(brandDone/BRAND_ITEMS.length*100)
    const brandColor=brandPct<50?'var(--red)':brandPct<80?'var(--amber)':'var(--signal)'
    // Load custom labels from readiness/brandReadiness objects (stored as label_XXX keys)
    const READINESS_ITEMS=DEFAULT_READINESS.map(i=>({...i,label:readiness['label_'+i.id]||i.label}))
    const readinessDone=READINESS_ITEMS.filter(i=>readiness[i.id]).length
    const readinessPct=Math.round(readinessDone/READINESS_ITEMS.length*100)
    const readinessColor=readinessPct<50?'var(--red)':readinessPct<80?'var(--amber)':'var(--signal)'
    const toggleReadiness=async(id:string)=>{
      const next={...readiness,[id]:!readiness[id]}
      setReadiness(next)
      await supabase.from('team_settings').upsert({id:'launch_readiness',value:next,updated_by:aktiv})
    }
    const updateReadinessLabel=async(id:string,label:string)=>{
      const next={...readiness,['label_'+id]:label}
      setReadiness(next)
      await supabase.from('team_settings').upsert({id:'launch_readiness',value:next,updated_by:aktiv})
    }
    const updateBrandLabel=async(id:string,label:string)=>{
      const next={...brandReadiness,['label_'+id]:label}
      setBrandReadiness(next)
      await supabase.from('team_settings').upsert({id:'brand_readiness',value:next,updated_by:aktiv})
    }
    const toggleBrandReadiness=async(id:string)=>{
      const next={...brandReadiness,[id]:!brandReadiness[id]}
      setBrandReadiness(next)
      await supabase.from('team_settings').upsert({id:'brand_readiness',value:next,updated_by:aktiv})
    }
    const addRisiko=async(titel:string,impact:string,owner:string,gegenmasnahme:string)=>{
      await supabase.from('risiken').insert({titel,impact,wahrscheinlichkeit:'Mittel',gegenmasnahme,owner,status:'Offen'})
    }
    const delRisiko=(id:string)=>confirm('Risiko löschen?',async()=>{
      setRisiken(prev=>prev.filter(r=>r.id!==id))
      await supabase.from('risiken').delete().eq('id',id)
    })
    const saveMission=async()=>{
      setWeeklyMission(missionDraft)
      setMissionEdit(false)
      await supabase.from('team_settings').upsert({id:'weekly_mission',value:{text:missionDraft},updated_by:aktiv})
    }
    const missionLines=weeklyMission.split('\n').filter(l=>l.trim()!=='')

    return (
      <div>
        {/* Executive Summary */}
        <div className="card" style={{marginBottom:'var(--sp4)',borderLeft:`3px solid ${statusColor}`}}>
          <div style={{padding:'var(--sp4)'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'var(--sp3)'}}>
              <div>
                <div style={{fontSize:'var(--text-xs)',fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'var(--sp1)'}}>QUADRAS · Launch Status</div>
                <div style={{fontSize:'var(--text-lg)',fontWeight:700,color:statusColor}}>{statusText}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:'var(--font-display)',fontSize:'var(--text-4xl)',fontWeight:700,color:statusColor,letterSpacing:'-1px',lineHeight:1}}>{gesamtPct}%</div>
                <div style={{fontSize:'var(--text-xs)',color:'var(--muted)',marginTop:2}}>aus Hauptaufgaben</div>
              </div>
            </div>
            <div className="launch-bar-phases" style={{marginBottom:'var(--sp2)'}}>
              {phasen.map(phase=>{
                const items=hauptaufgaben.filter(a=>a.phase===phase)
                const pct=items.length?Math.round(items.filter(a=>a.status==='Erledigt').length/items.length*100):0
                return <div key={phase} className="launch-bar-phase" title={`${phase}: ${pct}%`}><div className="launch-bar-phase-fill" style={{width:`${pct}%`}}/></div>
              })}
            </div>
            <div style={{display:'flex',gap:'var(--sp4)',flexWrap:'wrap',marginTop:'var(--sp2)'}}>
              {blockerAufgaben.length>0&&<span style={{fontSize:'var(--text-sm)',color:'var(--red)',fontWeight:600}}>{blockerAufgaben.length} Blocker aktiv</span>}
              {designFeedbackOffen.length>0&&<span style={{fontSize:'var(--text-sm)',color:'var(--amber)',fontWeight:600,cursor:'pointer'}} onClick={()=>setView('design')}>{designFeedbackOffen.length} Design{designFeedbackOffen.length===1?' wartet':' warten'} auf Feedback</span>}
              {ueberfaellig>0&&<span style={{fontSize:'var(--text-sm)',color:'var(--red)',fontWeight:600}}>{ueberfaellig} überfällig</span>}
              {blockerAufgaben.length===0&&designFeedbackOffen.length===0&&ueberfaellig===0&&<span style={{fontSize:'var(--text-sm)',color:'var(--signal)',fontWeight:600}}>Keine kritischen Probleme</span>}
            </div>
          </div>
        </div>

        {/* Command Bar — opens Cmd+K */}
        <div className="command-bar" onClick={()=>setCmdOpen(true)} role="button" tabIndex={0}>
          <svg className="command-icon" style={{width:16,height:16}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span className="command-placeholder">Suchen, navigieren, anlegen…</span>
          <span className="command-hint">⌘K</span>
        </div>

        {/* Hero */}
        <div className="cockpit-hero">
          <div className="cockpit-role"><div className="cockpit-dot" style={{background:PERSON_HEX[aktiv]}}/>{ap.role}</div>
          <div className="cockpit-name">{aktiv}</div>
          <div className="cockpit-meta">{new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
          {(()=>{const todayTasks=aufgaben.filter(a=>(a.personen||[a.person]).includes(aktiv)&&a.deadline===t&&a.status!=='Erledigt');return todayTasks.length>0&&(
            <div style={{marginTop:'var(--sp4)',paddingTop:'var(--sp4)',borderTop:'1px solid rgba(255,255,255,0.08)'}}>
              <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:'var(--sp2)'}}>Heute fällig — {todayTasks.length} Aufgabe{todayTasks.length>1?'n':''}</div>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                {todayTasks.slice(0,3).map(a=>(
                  <div key={a.id} style={{display:'flex',alignItems:'center',gap:'var(--sp2)',cursor:'pointer'}} onClick={()=>setFlyout(a)}>
                    <div style={{width:5,height:5,borderRadius:'50%',background:a.prioritaet==='Hoch'?'var(--red)':'var(--signal)',flexShrink:0}}/>
                    <span style={{fontSize:'var(--text-sm)',color:'rgba(255,255,255,0.7)',flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.titel}</span>
                  </div>
                ))}
                {todayTasks.length>3&&<div style={{fontSize:'var(--text-xs)',color:'rgba(255,255,255,0.3)',fontFamily:'var(--font-mono)'}}>+ {todayTasks.length-3} weitere</div>}
              </div>
            </div>
          )})()}
        </div>

        {/* Metrics */}
        <div className="metrics-row">
          <div className="metric"><div className="metric-num" style={{color:PERSON_HEX[aktiv]}}>{meineOffen}</div><div className="metric-lbl">Meine offenen</div><div className="metric-bar"><div className="metric-bar-fill" style={{width:`${donePct}%`,background:PERSON_HEX[aktiv]}}/></div></div>
          <div className="metric"><div className="metric-num" style={{color:ueberfaellig>0?'var(--red)':'var(--signal)'}}>{ueberfaellig}</div><div className="metric-lbl">Überfällig</div></div>
          <div className="metric"><div className="metric-num" style={{color:blockerAufgaben.length>0?'var(--red)':'var(--ink)'}}>{blockerAufgaben.length}</div><div className="metric-lbl">Blocker aktiv</div></div>
          <div className="metric"><div className="metric-num" style={{color:designFeedbackOffen.length>0?'var(--amber)':'var(--ink)'}}>{designFeedbackOffen.length}</div><div className="metric-lbl">Design-Feedback</div></div>
        </div>

        {/* 7-day timeline — includes done tasks (C fix) */}
        <div className="card" style={{marginBottom:'var(--sp4)'}}>
          <div className="section-label">Diese & nächste Woche</div>
          <div className="week-timeline">
            {weekDays.map(day=>{
              const dayTasks=alle7Tage.filter(a=>a.deadline===day)
              return (
                <div key={day} className={`week-day${day===t?' today':''}`}>
                  <div className="week-day-label">{new Date(day+'T12:00').toLocaleDateString('de-DE',{weekday:'short'})}</div>
                  <div className="week-day-date">{new Date(day+'T12:00').getDate()}</div>
                  <div className="week-day-tasks">
                    {dayTasks.map(a=>(
                      <div key={a.id} className="week-day-task-dot"
                        title={`${a.titel} · ${a.person}${a.status==='Erledigt'?' ✓':''}`}
                        style={{
                          background: a.status==='Erledigt'?'var(--bg2)':PERSON_HEX[a.person]||'var(--slate)',
                          color: a.status==='Erledigt'?'var(--muted)':'var(--surface)',
                          border: a.status==='Erledigt'?'1px solid var(--border2)':'none',
                          textDecoration: a.status==='Erledigt'?'line-through':'none',
                          opacity: a.status==='Erledigt'?0.5:1,
                        }}
                        onClick={()=>setFlyout(a)}>
                        {a.person[0]}
                      </div>
                    ))}
                    {dayTasks.length===0&&<div style={{height:'var(--sp5)'}}/>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Critical + Focus */}
        <div className="cockpit-grid">
          <div className="card">
            {kritisch.length>0?<div className="section-label-red">Kritisch — sofort handeln ({kritisch.length})</div>:<div className="section-label">Kein kritischer Pfad</div>}
            {loading?<SkeletonList rows={2}/>:kritisch.length===0
              ?<div className="empty"><div className="empty-title c-signal">Alles im grünen Bereich</div></div>
              :kritisch.slice(0,5).map(a=><AItem key={a.id} a={a} editable/>)}
          </div>
          <div className="card">
            <div className="section-label">Mein Fokus — Top 3</div>
            {loading?<SkeletonList rows={3}/>:meineFokus.length===0
              ?<div className="empty"><div className="empty-title c-signal">Keine offenen Aufgaben</div></div>
              :meineFokus.map(a=><AItem key={a.id} a={a} editable/>)}
          </div>
        </div>

        {/* B: Blocker Board */}
        {blockerAufgaben.length>0&&(
          <div className="card" style={{marginBottom:'var(--sp4)',borderLeft:'2px solid var(--red)'}}>
            <div className="section-label-red">Blocker — müssen sofort gelöst werden ({blockerAufgaben.length})</div>
            {blockerAufgaben.map(a=>(
              <div key={a.id} className="aufgabe" style={{borderBottom:'1px solid var(--border)'}}>
                <div className="a-body">
                  <div className="a-titel" onClick={()=>setFlyout(a)} style={{cursor:'pointer'}}>{a.titel}</div>
                  <div style={{fontSize:'var(--text-sm)',color:'var(--red)',marginTop:'var(--sp1)',fontWeight:600}}>
                    Blocker: {a.blocker}
                  </div>
                  <div className="a-meta-line" style={{marginTop:'var(--sp1)'}}>
                    <span style={{color:PERSON_HEX[a.person]||'var(--mid)',fontWeight:600}}>{a.person}</span>
                    <span className="a-meta-dot"/><span>{a.projekt}</span>
                  </div>
                </div>
                <button className="icon-btn" onClick={()=>setFlyout(a)}>{Ico.edit}</button>
              </div>
            ))}
          </div>
        )}

        {/* A: Design Feedback waiting */}
        {designFeedbackOffen.length>0&&(
          <div className="card" style={{marginBottom:'var(--sp4)',borderLeft:'2px solid var(--amber)'}}>
            <div style={{padding:'var(--sp3) var(--sp4) var(--sp2)',borderBottom:'1px solid var(--amber-bg)',background:'var(--amber-bg)',fontSize:'var(--text-xs)',fontWeight:700,color:'var(--amber)',textTransform:'uppercase',letterSpacing:'0.1em',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>Design wartet auf Feedback ({designFeedbackOffen.length})</span>
              <button className="btn btn-xs btn-amber" onClick={()=>setView('design')}>Design Studio öffnen</button>
            </div>
            {designFeedbackOffen.slice(0,4).map(i=>(
              <div key={i.id} style={{display:'flex',alignItems:'center',gap:'var(--sp3)',padding:'var(--sp2) var(--sp4)',borderBottom:'1px solid var(--border)',cursor:'pointer'}} onClick={()=>{setDesignFlyout(i);setView('design')}}>
                <div style={{width:36,height:36,borderRadius:'var(--r-patch)',background:'var(--bg2)',overflow:'hidden',flexShrink:0}}>
                  {i.url&&i.url.startsWith('https://')?<img src={i.url} alt={i.titel} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'var(--text-xs)',color:'var(--muted)'}}>{i.kategorie[0]}</div>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'var(--text-base)',fontWeight:500,color:'var(--ink)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{i.titel}</div>
                  <div style={{fontSize:'var(--text-xs)',color:'var(--muted)'}}>{i.kategorie} · {i.von} · <span style={{color:'var(--amber)',fontWeight:600}}>{i.freigabe==='Überarbeiten'?'Überarbeiten':'Feedback ausstehend'}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Area status */}
        {areaStats.length>0&&(
          <>
            <div style={{fontSize:'var(--text-md)',fontWeight:700,marginBottom:'var(--sp3)',color:'var(--ink)'}}>Bereichsstatus</div>
            <div className="area-grid" style={{marginBottom:'var(--sp5)'}}>
              {areaStats.map(a=>{
                const pct=a.total>0?Math.round(a.done/a.total*100):0
                const ampel=a.krit>0?'var(--red)':a.offen===0?'var(--signal)':pct>70?'var(--signal)':'var(--amber)'
                return (
                  <div key={a.proj} className="area-card" onClick={()=>{setFProjekt(a.proj);setView('aufgaben')}} style={{borderTop:`2px solid ${ampel}`}}>
                    <div className="area-name" title={a.proj}>{a.proj}</div>
                    <div className="area-stats">
                      {a.offen} offen
                      {a.krit>0&&<span style={{color:'var(--red)',marginLeft:'var(--sp2)',fontWeight:700}}>· {a.krit} kritisch</span>}
                      {(()=>{const meine=aufgaben.filter(x=>x.projekt===a.proj&&(x.personen||[x.person]).includes(aktiv)&&x.status!=='Erledigt').length;return meine>0&&<span style={{color:PERSON_HEX[aktiv]||'var(--slate)',marginLeft:'var(--sp2)',fontWeight:600}}>· {meine} meine</span>})()}
                    </div>
                    <div className="area-bar"><div className="area-bar-fill" style={{width:`${pct}%`,background:ampel}}/></div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Launch Readiness Checkliste */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'var(--sp3)'}}>
          <div style={{fontSize:'var(--text-md)',fontWeight:700,color:'var(--ink)'}}>Launch Readiness</div>
          <div style={{display:'flex',alignItems:'center',gap:'var(--sp3)'}}>
            <div style={{fontSize:'var(--text-sm)',color:readinessColor,fontWeight:700}}>{readinessDone}/{READINESS_ITEMS.length}</div>
            <div style={{fontSize:'var(--text-xs)',color:'var(--muted)'}}>{readinessPct}%</div>
          </div>
        </div>
        <div className="card" style={{marginBottom:'var(--sp5)'}}>
          <div className="readiness-score-bar" style={{margin:'var(--sp3) var(--sp4) 0'}}>
            <div className="readiness-score-fill" style={{width:`${readinessPct}%`,background:readinessColor}}/>
          </div>
          <div className="readiness-grid" style={{margin:'var(--sp3) var(--sp4) var(--sp4)'}}>
            {READINESS_ITEMS.map(item=>(
              <ReadinessItem key={item.id} item={item} checked={!!readiness[item.id]}
                onToggle={()=>toggleReadiness(item.id)}
                onLabelSave={(label)=>updateReadinessLabel(item.id,label)}/>
            ))}
          </div>
        </div>

        {/* Decision Queue — Decision → Task */}
        {offeneEntscheidungen.length>0&&(
          <div style={{marginBottom:'var(--sp5)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'var(--sp3)'}}>
              <div style={{fontSize:'var(--text-md)',fontWeight:700,color:'var(--ink)'}}>Entscheidungen</div>
              <button className="btn btn-xs btn-secondary" onClick={()=>setView('entscheidungen')}>Alle ansehen</button>
            </div>
            <div className="card">
              {offeneEntscheidungen.map((e,idx)=>(
                <div key={e.id} className="decision-queue-item">
                  <div className="dq-index">{String(idx+1).padStart(2,'0')}</div>
                  <div className="dq-body">
                    <div className="dq-titel">{e.titel}</div>
                    <div className="dq-meta">{e.projekt} · {fmtDate(e.datum)}{e.naechster_schritt&&<span style={{color:'var(--signal)'}}> · → {e.naechster_schritt}</span>}</div>
                  </div>
                  <div className="dq-actions">
                    <button className="btn btn-xs btn-signal"
                      title="Folgeaufgabe aus dieser Entscheidung erstellen"
                      onClick={()=>{
                        setEditA({titel:`Folgeaufgabe: ${e.titel}`,beschreibung:`Aus Entscheidung vom ${fmtDate(e.datum)}: ${e.naechster_schritt||e.begruendung}`,person:aktiv,personen:[aktiv],projekt:e.projekt,prioritaet:'Hoch',status:'Offen',deadline:'',ergebnis:'',blocker:'',nummer:null,phase:'',sortierung:0,ist_hauptaufgabe:false,parent_id:null,completed_at:null,id:'',created_at:'',updated_at:''} as unknown as Aufgabe)
                        setModal('aufgabe')
                      }}>+ Aufgabe</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Brand Readiness */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'var(--sp3)'}}>
          <div style={{fontSize:'var(--text-md)',fontWeight:700,color:'var(--ink)'}}>Brand Readiness</div>
          <div style={{display:'flex',alignItems:'center',gap:'var(--sp3)'}}>
            <div style={{fontSize:'var(--text-sm)',color:brandColor,fontWeight:700}}>{brandDone}/{BRAND_ITEMS.length}</div>
            <div style={{fontSize:'var(--text-xs)',color:'var(--muted)'}}>{brandPct}%</div>
          </div>
        </div>
        <div className="card" style={{marginBottom:'var(--sp5)'}}>
          <div className="readiness-score-bar" style={{margin:'var(--sp3) var(--sp4) 0'}}>
            <div className="readiness-score-fill" style={{width:`${brandPct}%`,background:brandColor}}/>
          </div>
          <div className="readiness-grid" style={{margin:'var(--sp3) var(--sp4) var(--sp4)'}}>
            {BRAND_ITEMS.map(item=>(
              <ReadinessItem key={item.id} item={item} checked={!!brandReadiness[item.id]}
                onToggle={()=>toggleBrandReadiness(item.id)}
                onLabelSave={(label)=>updateBrandLabel(item.id,label)}/>
            ))}
          </div>
        </div>

        {/* Risk Log */}
        <RiskLog risiken={risiken} aktiv={aktiv} onAdd={addRisiko} onDel={delRisiko}/>

        {/* Team — compact */}
        <div style={{fontSize:'var(--text-md)',fontWeight:700,marginBottom:'var(--sp3)',color:'var(--ink)'}}>Team</div>
        <div className="card" style={{marginBottom:'var(--sp5)'}}>
          {PERSONEN.map((p,pi)=>{
            const pA=aufgaben.filter(a=>(a.personen||[a.person]).includes(p.name)&&a.status!=='Erledigt'&&!a.parent_id)
            const pDone=aufgaben.filter(a=>a.person===p.name&&a.status==='Erledigt').length
            const pTotal=aufgaben.filter(a=>a.person===p.name).length
            const pPct=pTotal>0?Math.round(pDone/pTotal*100):0
            const inArbeit=pA.filter(a=>a.status==='In Arbeit').length
            return (
              <div key={p.name} style={{display:'flex',alignItems:'center',gap:'var(--sp4)',padding:'var(--sp3) var(--sp5)',borderBottom:pi<PERSONEN.length-1?'1px solid var(--border)':'none'}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:PERSON_HEX[p.name],display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'var(--text-sm)',fontWeight:700,flexShrink:0}}>{p.name[0]}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:'var(--sp2)',marginBottom:4}}>
                    <span style={{fontWeight:700,color:PERSON_HEX[p.name],fontSize:'var(--text-base)'}}>{p.name}</span>
                    <span style={{fontSize:'var(--text-xs)',color:'var(--muted)',fontFamily:'var(--font-mono)'}}>{p.role}</span>
                    {wipWarn(p.name)==='rot'&&<span className="wip-warning">Überladen</span>}
                    {wipWarn(p.name)==='gelb'&&<span className="wip-warning" style={{background:'var(--amber-bg)',color:'var(--amber)'}}>Voll</span>}
                  </div>
                  <div className="metric-bar" style={{height:3,borderRadius:2}}>
                    <div className="metric-bar-fill" style={{width:`${pPct}%`,background:PERSON_HEX[p.name]}}/>
                  </div>
                </div>
                <div style={{display:'flex',gap:'var(--sp4)',flexShrink:0,textAlign:'center'}}>
                  <div>
                    <div style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-lg)',fontWeight:700,color:pA.length>0?PERSON_HEX[p.name]:'var(--muted)',lineHeight:1}}>{pA.length}</div>
                    <div style={{fontSize:10,color:'var(--muted)',fontFamily:'var(--font-mono)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Offen</div>
                  </div>
                  {inArbeit>0&&<div>
                    <div style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-lg)',fontWeight:700,color:'var(--amber)',lineHeight:1}}>{inArbeit}</div>
                    <div style={{fontSize:10,color:'var(--muted)',fontFamily:'var(--font-mono)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Aktiv</div>
                  </div>}
                  <div>
                    <div style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-lg)',fontWeight:700,color:'var(--signal)',lineHeight:1}}>{pPct}%</div>
                    <div style={{fontSize:10,color:'var(--muted)',fontFamily:'var(--font-mono)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Done</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Activity Log */}
        {activity.length>0&&(
          <div className="card">
            <div className="section-label">Letzte Aktivität</div>
            {activity.slice(0,8).map(a=>(
              <div key={a.id} className="activity-item">
                <div className="activity-dot" style={{background:PERSON_HEX[a.person]||'var(--muted)'}}/>
                <div className="activity-text">
                  <span style={{fontWeight:600,color:PERSON_HEX[a.person]||'var(--slate)'}}>{a.person}</span>{' '}hat <em>{a.entity_titel}</em> {a.action}
                </div>
                <div className="activity-time">{new Date(a.created_at).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})} {new Date(a.created_at).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}</div>
              </div>
            ))}
          </div>
        )}

        {/* Wochenbericht */}
        <WochenberichtBlock/>
      </div>
    )
  }


  // ── Wochenbericht ──────────────────────────────────────────────────────────
  function WochenberichtBlock() {
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (now.getDay()===0?6:now.getDay()-1))
    monday.setHours(0,0,0,0)
    const mondayStr = monday.toISOString()
    const doneThisWeek = aufgaben.filter(a=>a.status==='Erledigt'&&a.completed_at&&a.completed_at>=mondayStr)
    const doneLastWeek = aufgaben.filter(a=>{
      if(a.status!=='Erledigt'||!a.completed_at) return false
      const d=new Date(a.completed_at)
      const lmStart=new Date(monday); lmStart.setDate(lmStart.getDate()-7)
      return d>=lmStart&&d<monday
    })
    const diff = doneThisWeek.length - doneLastWeek.length
    if(doneThisWeek.length===0&&doneLastWeek.length===0) return null
    return (
      <div className="card" style={{marginBottom:'var(--sp4)'}}>
        <div className="section-label">Wochenbericht</div>
        <div style={{padding:'var(--sp4) var(--sp5)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'var(--sp4)',marginBottom:'var(--sp3)'}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-3xl)',fontWeight:700,color:'var(--signal)',letterSpacing:'-1px'}}>{doneThisWeek.length}</div>
              <div style={{fontSize:'var(--text-xs)',color:'var(--muted)',fontFamily:'var(--font-mono)',textTransform:'uppercase',letterSpacing:'0.08em'}}>Diese Woche</div>
            </div>
            <div style={{flex:1,height:1,background:'var(--border)'}}/>
            <div style={{textAlign:'center'}}>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-xl)',fontWeight:700,color:'var(--mid)',letterSpacing:'-0.5px'}}>{doneLastWeek.length}</div>
              <div style={{fontSize:'var(--text-xs)',color:'var(--muted)',fontFamily:'var(--font-mono)',textTransform:'uppercase',letterSpacing:'0.08em'}}>Letzte Woche</div>
            </div>
            <div style={{padding:'4px 10px',borderRadius:'var(--r-full)',background:diff>0?'var(--signal-bg)':diff<0?'var(--red-bg)':'rgba(15,19,24,0.05)',color:diff>0?'var(--signal)':diff<0?'var(--red)':'var(--muted)',fontFamily:'var(--font-mono)',fontSize:'var(--text-xs)',fontWeight:700}}>
              {diff>0?`+${diff}`:diff===0?'=':`${diff}`}
            </div>
          </div>
          {doneThisWeek.length>0&&(
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {doneThisWeek.slice(0,5).map(a=>(
                <div key={a.id} style={{display:'flex',alignItems:'center',gap:'var(--sp2)',fontSize:'var(--text-sm)',color:'var(--mid)'}}>
                  <span style={{color:'var(--signal)',fontSize:10}}>✓</span>
                  <span style={{flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.titel}</span>
                  <span style={{fontSize:10,color:'var(--muted)',fontFamily:'var(--font-mono)',flexShrink:0}}>{a.person}</span>
                </div>
              ))}
              {doneThisWeek.length>5&&<div style={{fontSize:'var(--text-xs)',color:'var(--muted)',fontFamily:'var(--font-mono)'}}>+ {doneThisWeek.length-5} weitere</div>}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Notification Center ─────────────────────────────────────────────────────
  function NotificationCenter() {
    const unread = notifications.filter(n=>!n.gelesen).length
    const markAllRead = async() => {
      setNotifications(prev=>prev.map(n=>({...n,gelesen:true})))
      setLastSeen(new Date().toISOString())
      const ids=notifications.filter(n=>!n.gelesen).map(n=>n.id)
      if(ids.length>0) await supabase.from('notifications').update({gelesen:true}).in('id',ids)
    }
    const typIcon=(t:string)=>{
      if(t==='kommentar') return '💬'
      if(t==='mention') return '👋'
      if(t==='zuweisung') return '✅'
      if(t==='aufgabe_neu') return '🆕'
      return '📌'
    }
    return (
      <div style={{position:'relative',display:'inline-block'}}>
        <button
          onClick={()=>{setNotifOpen(o=>!o);if(!notifOpen)markAllRead()}}
          style={{width:36,height:36,borderRadius:'50%',border:'1px solid var(--border2)',background:unread>0?'var(--ink)':'rgba(255,255,255,0.7)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',position:'relative',transition:'all var(--anim-micro)',backdropFilter:'blur(8px)'}}>
          <svg style={{width:15,height:15,stroke:unread>0?'#fff':'var(--mid)'}} viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          {unread>0&&<div style={{position:'absolute',top:-3,right:-3,width:16,height:16,borderRadius:'50%',background:'var(--red)',border:'2px solid white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:'#fff',fontFamily:'var(--font-mono)'}}>{unread>9?'9+':unread}</div>}
        </button>
        {notifOpen&&(
          <>
            <div style={{position:'fixed',inset:0,zIndex:499}} onClick={()=>setNotifOpen(false)}/>
            <div style={{position:'fixed',top:64,right:16,width:'min(360px, calc(100vw - 32px))',maxHeight:'calc(100vh - 80px)',background:'rgba(255,255,255,0.97)',backdropFilter:'blur(28px)',border:'1px solid rgba(255,255,255,0.8)',borderRadius:'var(--r-2xl)',boxShadow:'var(--sh-xl)',zIndex:500,overflow:'hidden',animation:'scaleIn 0.18s cubic-bezier(0.34,1.56,0.64,1)'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'var(--sp4) var(--sp5) var(--sp3)',borderBottom:'1px solid var(--border)'}}>
                <div style={{fontFamily:'var(--font-mono)',fontSize:10,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.13em'}}>Benachrichtigungen</div>
                {notifications.length>0&&<button onClick={markAllRead} style={{fontSize:'var(--text-xs)',color:'var(--signal)',background:'none',border:'none',cursor:'pointer',fontFamily:'var(--font-mono)',fontWeight:600}}>Alle gelesen</button>}
              </div>
              <div style={{maxHeight:400,overflowY:'auto'}}>
                {notifications.length===0&&<div style={{padding:'var(--sp8)',textAlign:'center',fontSize:'var(--text-sm)',color:'var(--muted)'}}>Keine Benachrichtigungen</div>}
                {notifications.slice(0,20).map(n=>(
                  <div key={n.id} style={{display:'flex',gap:'var(--sp3)',padding:'var(--sp3) var(--sp4)',borderBottom:'1px solid var(--border)',background:n.gelesen?'transparent':'rgba(62,111,90,0.04)',transition:'background var(--anim-micro)'}}>
                    <div style={{fontSize:16,flexShrink:0,marginTop:1,cursor:n.entity_id?'pointer':'default'}} onClick={()=>{if(n.entity_id){const a=aufgaben.find(x=>x.id===n.entity_id);if(a)setFlyout(a)};setNotifOpen(false)}}>{typIcon(n.typ)}</div>
                    <div style={{flex:1,minWidth:0,cursor:n.entity_id?'pointer':'default'}} onClick={()=>{if(n.entity_id){const a=aufgaben.find(x=>x.id===n.entity_id);if(a)setFlyout(a)};setNotifOpen(false)}}>
                      <div style={{fontSize:'var(--text-sm)',fontWeight:n.gelesen?400:600,color:'var(--ink)',marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{n.titel}</div>
                      <div style={{fontSize:'var(--text-xs)',color:'var(--mid)',lineHeight:1.4}}>{n.nachricht}</div>
                      <div style={{fontSize:10,color:'var(--muted)',marginTop:2,fontFamily:'var(--font-mono)'}}>{new Date(n.created_at).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,flexShrink:0}}>
                      {!n.gelesen&&<div style={{width:6,height:6,borderRadius:'50%',background:'var(--signal)',marginTop:5}}/>}
                      <button onClick={async()=>{setNotifications(prev=>prev.filter(x=>x.id!==n.id));await supabase.from('notifications').delete().eq('id',n.id)}} style={{width:18,height:18,borderRadius:'50%',border:'none',background:'transparent',cursor:'pointer',color:'var(--muted)',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center',opacity:0.5}} title="Löschen">×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // ── Command Center (Cmd+K) ──────────────────────────────────────────────────
  function CommandCenter() {
    const [q,setQ]=useState(cmdQuery)
    const [history,setHistory]=useState<string[]>(()=>{try{return JSON.parse(localStorage.getItem('qos-search-history')||'[]')}catch{return[]}})
    const ref=useRef<HTMLInputElement>(null)
    useEffect(()=>{ ref.current?.focus() },[])
    const addToHistory=(term:string)=>{
      const next=[term,...history.filter(h=>h!==term)].slice(0,5)
      setHistory(next)
      try{localStorage.setItem('qos-search-history',JSON.stringify(next))}catch{}
    }

    const results:{type:string;item:Aufgabe|Entscheidung|DesignIdee|Datei;title:string;sub:string}[]=[]
    if(q.trim().length>0) {
      const ql=q.toLowerCase()
      aufgaben.filter(a=>a.titel.toLowerCase().includes(ql)||a.beschreibung?.toLowerCase().includes(ql)).slice(0,4).forEach(a=>
        results.push({type:'aufgabe',item:a,title:a.titel,sub:`${a.person} · ${a.projekt} · ${a.status}`}))
      entscheid.filter(e=>e.titel.toLowerCase().includes(ql)).slice(0,3).forEach(e=>
        results.push({type:'entscheidung',item:e,title:e.titel,sub:`${e.projekt} · ${fmtDate(e.datum)}`}))
      ideen.filter(i=>i.titel.toLowerCase().includes(ql)).slice(0,3).forEach(i=>
        results.push({type:'design',item:i,title:i.titel,sub:`${i.kategorie} · ${i.freigabe}`}))
      dateien.filter(d=>d.name.toLowerCase().includes(ql)).slice(0,2).forEach(d=>
        results.push({type:'datei',item:d,title:d.name,sub:d.projekt}))
    }

    const go=(r:typeof results[0])=>{
      if(q.trim()) addToHistory(q.trim())
      if(r.type==='aufgabe'){setFlyout(r.item as Aufgabe)}
      if(r.type==='entscheidung'){setView('entscheidungen')}
      if(r.type==='design'){setDesignFlyout(r.item as DesignIdee);setView('design')}
      if(r.type==='datei'){setView('dateien')}
      setCmdOpen(false); setCmdQuery('')
    }

    const typeIcon=(t:string)=>{
      if(t==='aufgabe') return Ico.aufg
      if(t==='entscheidung') return Ico.decide
      if(t==='design') return Ico.design
      return Ico.files
    }

    return (
      <div className="cmd-overlay" onClick={e=>e.target===e.currentTarget&&setCmdOpen(false)}>
        <div className="cmd-modal">
          <div className="cmd-input-wrap">
            <svg style={{width:18,height:18,color:'var(--muted)',flexShrink:0}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input ref={ref} className="cmd-input" placeholder="Suchen…" value={q}
              onChange={e=>setQ(e.target.value)}
              onKeyDown={e=>{if(e.key==='Escape'){setCmdOpen(false);setCmdQuery('')}}}/>
            <span className="cmd-esc">esc</span>
          </div>
          <div className="cmd-results">
            {q.trim()===''&&(
              <div>
                {history.length>0&&<><div className="cmd-section-hdr">Zuletzt gesucht</div>{history.map((h,i)=><div key={i} className="cmd-item" onClick={()=>setQ(h)}><div className="cmd-item-icon" style={{fontSize:12,color:'var(--muted)'}}>↺</div><div className="cmd-item-body"><div className="cmd-item-title" style={{color:'var(--muted)'}}>{h}</div></div></div>)}</>}
                <div className="cmd-section-hdr">Schnellzugriff</div>
                {[{label:'Neue Aufgabe',action:()=>{setEditA(null);setModal('aufgabe');setCmdOpen(false)},icon:Ico.aufg},
                  {label:'Launch Plan',action:()=>{setView('plan');setCmdOpen(false)},icon:Ico.plan},
                  {label:'Design Studio',action:()=>{setView('design');setCmdOpen(false)},icon:Ico.design},
                  {label:'Neue Entscheidung',action:()=>{setModal('entscheidung');setCmdOpen(false)},icon:Ico.decide},
                ].map((item,i)=>(
                  <div key={i} className="cmd-item" onClick={item.action}>
                    <div className="cmd-item-icon">{item.icon}</div>
                    <div className="cmd-item-body"><div className="cmd-item-title">{item.label}</div></div>
                  </div>
                ))}
              </div>
            )}
            {q.trim()!==''&&results.length===0&&<div className="cmd-empty">Keine Ergebnisse für „{q}"</div>}
            {results.length>0&&(
              <div>
                <div className="cmd-section-hdr">{results.length} Ergebnisse</div>
                {results.map((r,i)=>(
                  <div key={i} className="cmd-item" onClick={()=>go(r)}>
                    <div className="cmd-item-icon">{typeIcon(r.type)}</div>
                    <div className="cmd-item-body">
                      <div className="cmd-item-title">{r.title}</div>
                      <div className="cmd-item-sub">{r.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Focus Mode ───────────────────────────────────────────────────────────────
  function FocusMode({task}:{task:Aufgabe}) {
    const [seconds, setSeconds] = useState(0)
    const [running, setRunning] = useState(false)
    useEffect(()=>{
      if(!running) return
      const id=setInterval(()=>setSeconds(s=>s+1),1000)
      return ()=>clearInterval(id)
    },[running])
    const fmt=(s:number)=>`${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
    return (
      <div className="focus-overlay" onClick={e=>e.target===e.currentTarget&&setFocusTask(null)}>
        <div style={{position:'relative'}}>
          <button className="focus-close" onClick={()=>setFocusTask(null)}>Beenden · Esc</button>
          <div className="focus-card">
            <div className="focus-eyebrow">
              <div style={{width:5,height:5,borderRadius:'50%',background:running?'var(--signal)':'rgba(255,255,255,0.3)',animation:running?'pulse 2.5s infinite':undefined}}/>
              Deep Work · {task.person} · {task.projekt}
            </div>
            <div className="focus-title">{task.titel}</div>
            {/* Timer */}
            <div style={{display:'flex',alignItems:'center',gap:'var(--sp4)',marginBottom:'var(--sp6)',padding:'var(--sp4) var(--sp5)',background:'rgba(255,255,255,0.05)',borderRadius:'var(--r-xl)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-2xl)',fontWeight:700,color:running?'#fff':'rgba(255,255,255,0.4)',letterSpacing:'0.05em',flex:1}}>{fmt(seconds)}</div>
              <button onClick={()=>setRunning(r=>!r)} style={{padding:'8px 16px',borderRadius:'var(--r-lg)',border:'1px solid rgba(255,255,255,0.15)',background:running?'rgba(143,62,54,0.3)':'rgba(62,111,90,0.3)',color:running?'#ff9a9a':'#6fcfa3',fontSize:'var(--text-sm)',fontWeight:600,cursor:'pointer',fontFamily:'var(--font)'}}>
                {running?'Pause':'Start'}
              </button>
              {seconds>0&&<button onClick={()=>{setSeconds(0);setRunning(false)}} style={{padding:'8px 12px',borderRadius:'var(--r-lg)',border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.4)',fontSize:'var(--text-sm)',cursor:'pointer',fontFamily:'var(--font)'}}>Reset</button>}
            </div>
            {task.ergebnis&&(
              <>
                <div className="focus-result-lbl">Gewünschtes Ergebnis</div>
                <div className="focus-result">{task.ergebnis}</div>
              </>
            )}
            {task.blocker&&(
              <div style={{padding:'var(--sp3) var(--sp4)',background:'rgba(143,62,54,0.15)',borderRadius:'var(--r-xl)',borderLeft:'2px solid var(--red)',marginBottom:'var(--sp4)'}}>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',fontWeight:700,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4}}>Blocker</div>
                <div style={{fontSize:'var(--text-base)',color:'rgba(255,255,255,0.65)'}}>{task.blocker}</div>
              </div>
            )}
            <div style={{display:'flex',gap:'var(--sp2)'}}>
              <button className="btn btn-signal btn-sm" onClick={()=>{toggleStatus(task);setFocusTask(null)}}>Als erledigt markieren</button>
              <button className="btn btn-sm" style={{background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.6)',border:'1px solid rgba(255,255,255,0.10)'}} onClick={()=>{setFlyout(task);setFocusTask(null)}}>Details öffnen</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── ReadinessItem — editable label ─────────────────────────────────────────
  function ReadinessItem({item,checked,onToggle,onLabelSave}:{item:{id:string;label:string};checked:boolean;onToggle:()=>void;onLabelSave:(l:string)=>void}) {
    const [editing,setEditing]=useState(false)
    const [draft,setDraft]=useState(item.label)
    const save=()=>{ onLabelSave(draft); setEditing(false) }
    return (
      <div className={`readiness-item${checked?' done':''}`}>
        <button className={`readiness-check${checked?' done':''}`} onClick={onToggle}>
          {checked&&<svg style={{width:9,height:9}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
        </button>
        {editing ? (
          <div style={{flex:1,display:'flex',gap:'var(--sp1)',alignItems:'center'}} onClick={e=>e.stopPropagation()}>
            <input autoFocus className="form-input" style={{fontSize:'var(--text-sm)',padding:'2px var(--sp2)',flex:1}}
              value={draft} onChange={e=>setDraft(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter')save();if(e.key==='Escape')setEditing(false)}}/>
            <button className="btn btn-xs btn-signal" onClick={save}>✓</button>
            <button className="btn btn-xs btn-secondary" onClick={()=>setEditing(false)}>✕</button>
          </div>
        ) : (
          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'space-between',gap:'var(--sp1)'}}>
            <span className="readiness-label" onClick={onToggle}>{item.label}</span>
            <button className="icon-btn" style={{width:20,height:20,flexShrink:0}}
              onClick={e=>{e.stopPropagation();setDraft(item.label);setEditing(true)}}>{Ico.edit}</button>
          </div>
        )}
      </div>
    )
  }

  // ── Risk Log Component ──────────────────────────────────────────────────────
  function RiskLog({risiken,aktiv,onAdd,onDel}:{risiken:Risiko[];aktiv:string;onAdd:(t:string,i:string,o:string,g:string)=>void;onDel:(id:string)=>void}) {
    const [show,setShow]=useState(false)
    const [f,setF]=useState({titel:'',impact:'Hoch',owner:aktiv,gegenmasnahme:''})
    const impactColor=(i:string)=>i==='Hoch'?'var(--red)':i==='Mittel'?'var(--amber)':'var(--signal)'
    const statusColor=(s:string)=>s==='Eingetreten'?'var(--red)':s==='Offen'?'var(--amber)':'var(--muted)'
    return (
      <div style={{marginBottom:'var(--sp5)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'var(--sp3)'}}>
          <div style={{fontSize:'var(--text-md)',fontWeight:700,color:'var(--ink)'}}>Risiken</div>
          <button className="btn btn-xs btn-secondary" onClick={()=>setShow(s=>!s)}>{show?'Abbrechen':'+ Risiko'}</button>
        </div>
        {show&&(
          <div className="card" style={{marginBottom:'var(--sp3)',padding:'var(--sp4)'}}>
            <div className="form-group"><label className="form-label">Risiko *</label><input className="form-input" style={{fontSize:'var(--text-sm)'}} placeholder="z.B. Packaging Lieferzeit zu lang" value={f.titel} onChange={e=>setF(p=>({...p,titel:e.target.value}))}/></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Impact</label><select className="form-input" style={{fontSize:'var(--text-sm)'}} value={f.impact} onChange={e=>setF(p=>({...p,impact:e.target.value}))}><option>Hoch</option><option>Mittel</option><option>Niedrig</option></select></div>
              <div className="form-group"><label className="form-label">Owner</label><select className="form-input" style={{fontSize:'var(--text-sm)'}} value={f.owner} onChange={e=>setF(p=>({...p,owner:e.target.value}))}>{PERSONEN.map(p=><option key={p.name}>{p.name}</option>)}</select></div>
            </div>
            <div className="form-group"><label className="form-label">Gegenmaßnahme</label><input className="form-input" style={{fontSize:'var(--text-sm)'}} placeholder="Was tun wenn es eintritt?" value={f.gegenmasnahme} onChange={e=>setF(p=>({...p,gegenmasnahme:e.target.value}))}/></div>
            <div style={{display:'flex',gap:'var(--sp2)'}}>
              <button className="btn btn-primary btn-sm" onClick={()=>{if(!f.titel.trim())return;onAdd(f.titel,f.impact,f.owner,f.gegenmasnahme);setF({titel:'',impact:'Hoch',owner:aktiv,gegenmasnahme:''});setShow(false)}}>Speichern</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>setShow(false)}>Abbrechen</button>
            </div>
          </div>
        )}
        {risiken.length===0&&!show&&<div className="card"><div className="empty"><div className="empty-title">Keine Risiken erfasst</div><div className="empty-sub">Füge bekannte Risiken hinzu bevor sie eintreten</div></div></div>}
        {risiken.length>0&&(
          <div className="card">
            {risiken.map(r=>(
              <div key={r.id} style={{display:'flex',alignItems:'flex-start',gap:'var(--sp3)',padding:'var(--sp3) var(--sp4)',borderBottom:'1px solid var(--border)'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:impactColor(r.impact),flexShrink:0,marginTop:5}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'var(--text-base)',fontWeight:500,color:'var(--ink)',marginBottom:2}}>{r.titel}</div>
                  {r.gegenmasnahme&&<div style={{fontSize:'var(--text-xs)',color:'var(--mid)',marginBottom:2}}>→ {r.gegenmasnahme}</div>}
                  <div style={{fontSize:'var(--text-xs)',color:'var(--muted)'}}>{r.owner} · Impact: <span style={{color:impactColor(r.impact),fontWeight:600}}>{r.impact}</span> · <span style={{color:statusColor(r.status)}}>{r.status}</span></div>
                </div>
                <button className="icon-btn del" onClick={()=>onDel(r.id)} style={{flexShrink:0}}>{Ico.trash}</button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function PlanView() {
    const gesamtDone=hauptaufgaben.filter(a=>a.status==='Erledigt').length
    const gesamtPct=hauptaufgaben.length>0?Math.round(gesamtDone/hauptaufgaben.length*100):0
    const [showAddPhase, setShowAddPhase] = useState(false)
    const [newPhase, setNewPhase] = useState(phasen[0]||'Phase 1 · Fundament')
    const [newTitel, setNewTitel] = useState('')
    const [newPerson, setNewPerson] = useState<PersonName>('Alexander')
    const [newDeadline, setNewDeadline] = useState('')
    const [newErgebnis, setNewErgebnis] = useState('')
    const [newNummer, setNewNummer] = useState('')
    const [addingH, setAddingH] = useState(false)

    const addHauptaufgabe = async () => {
      if(!newTitel.trim()) return
      if(!newErgebnis.trim()) return
      setAddingH(true)
      const nummerWert = newNummer ? parseInt(newNummer) : Math.max(0,...hauptaufgaben.map(a=>a.nummer||0)) + 1
      const nextSort = Math.max(0,...hauptaufgaben.filter(a=>a.phase===newPhase).map(a=>a.sortierung||0)) + 1
      await supabase.from('aufgaben').insert({
        nummer: nummerWert, titel: newTitel.trim(), person: newPerson,
        projekt: 'Organisation', prioritaet: 'Hoch', status: 'Offen',
        deadline: newDeadline, ergebnis: newErgebnis.trim(),
        phase: newPhase, sortierung: nextSort,
        ist_hauptaufgabe: true, beschreibung: '', blocker: '',
        parent_id: null, completed_at: null
      })
      setNewTitel(''); setNewDeadline(''); setNewErgebnis(''); setNewNummer('')
      setAddingH(false); setShowAddPhase(false)
      toast('Hauptaufgabe hinzugefügt', 'success')
    }

    return (
      <div>
        <div className="page-head">
          <div><div className="page-title">Launch Plan</div><div className="page-sub">{hauptaufgaben.length} Hauptaufgaben · {gesamtDone}/{hauptaufgaben.length} erledigt · <kbd className="kbd">P</kbd></div></div>
          <button className="btn btn-primary" onClick={()=>setShowAddPhase(s=>!s)}>{Ico.plus} Hauptaufgabe</button>
        </div>

        {showAddPhase&&(
          <div className="card" style={{marginBottom:'var(--sp4)',padding:'var(--sp4)'}}>
            <div style={{fontSize:'var(--text-sm)',fontWeight:700,color:'var(--ink)',marginBottom:'var(--sp3)'}}>Neue Hauptaufgabe zum Launch Plan hinzufügen</div>
            <div className="form-row" style={{marginBottom:'var(--sp3)'}}>
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">Phase</label>
                <select className="form-input" value={newPhase} onChange={e=>setNewPhase(e.target.value)}>
                  {phasen.map(p=><option key={p}>{p}</option>)}
                  <option value="Phase 6 · Neue Phase">+ Neue Phase</option>
                </select>
              </div>
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">Verantwortlich</label>
                <select className="form-input" value={newPerson} onChange={e=>setNewPerson(e.target.value as PersonName)}>
                  {PERSONEN.map(p=><option key={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">Nummer</label>
                <input type="number" min="1" className="form-input" placeholder="z.B. 01" value={newNummer} onChange={e=>setNewNummer(e.target.value)}/>
              </div>
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">Deadline (optional)</label>
                <input type="date" className="form-input" value={newDeadline} onChange={e=>setNewDeadline(e.target.value)}/>
              </div>
            </div>
            <div className="form-group" style={{marginBottom:'var(--sp3)'}}>
              <label className="form-label">Aufgabe *</label>
              <input className="form-input" placeholder="z.B. Verpackungsdesign finalisieren" value={newTitel} onChange={e=>setNewTitel(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&addHauptaufgabe()}/>
            </div>
            <div className="form-group" style={{marginBottom:'var(--sp3)'}}>
              <label className="form-label">Gewünschtes Ergebnis *</label>
              <input className="form-input" placeholder="Wann ist die Aufgabe WIRKLICH erledigt?" value={newErgebnis} onChange={e=>setNewErgebnis(e.target.value)}/>
            </div>
            <div style={{display:'flex',gap:'var(--sp2)'}}>
              <button className="btn btn-primary btn-sm" onClick={addHauptaufgabe} disabled={addingH}>{addingH?'…':'Hinzufügen'}</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>setShowAddPhase(false)}>Abbrechen</button>
            </div>
          </div>
        )}
        <div className="metric-bar" style={{height:6,borderRadius:'var(--r-sm)',marginBottom:'var(--sp6)'}}>
          <div className="metric-bar-fill" style={{width:`${gesamtPct}%`,background:'var(--signal)',height:6,borderRadius:'var(--r-sm)'}}/>
        </div>
        {loading?<>{Array.from({length:3}).map((_,i)=><div key={i} className="card" style={{padding:'var(--sp4)',marginBottom:'var(--sp4)'}}><SkeletonList rows={3}/></div>)}</>
          :phasen.map(phase=>{
            const items=hauptaufgaben.filter(a=>a.phase===phase).sort((a,b)=>a.sortierung-b.sortierung)
            const done=items.filter(a=>a.status==='Erledigt').length
            const pct=items.length>0?Math.round(done/items.length*100):0
            return (
              <div className="card phase-card" key={phase}>
                <div className="phase-head"><div><div className="phase-name">{phase}</div><div className="phase-sub">{done} von {items.length} erledigt</div></div><div className="phase-pct">{pct}%</div></div>
                <div className="phase-bar"><div className="phase-bar-f" style={{width:`${pct}%`}}/></div>
                {items.map(a=>{
                  const subs=aufgaben.filter(x=>x.parent_id===a.id)
                  const subDone=subs.filter(s=>s.status==='Erledigt').length
                  return (
                    <div key={a.id}>
                      <AItem a={a} editable/>
                      {subs.length>0&&(
                        <div style={{background:'var(--bg)',borderBottom:'1px solid var(--border)'}}>
                          {subs.map(sub=>(
                            <div key={sub.id} className="subtask">
                              <button className={`subtask-check${sub.status==='Erledigt'?' done':''}`} onClick={()=>toggleSubtask(sub)}>
                                {sub.status==='Erledigt'&&<span className="subtask-check-mark">✓</span>}
                              </button>
                              <span className={`subtask-title${sub.status==='Erledigt'?' done':''}`} onClick={()=>setFlyout(sub)}>{sub.titel}</span>
                              <span style={{fontSize:'var(--text-xs)',color:PERSON_HEX[sub.person]||'var(--mid)',fontWeight:600}}>{sub.person}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
      </div>
    )
  }

  function AufgabenView() {
    const [sortBy, setSortBy] = useState<'deadline'|'prioritaet'|'person'|'created'>('created')
    const sorted = [...gefiltert].filter(a=>!a.parent_id||fStatus!=='Alle').sort((a,b)=>{
      if(sortBy==='deadline') return (a.deadline||'9999').localeCompare(b.deadline||'9999')
      if(sortBy==='prioritaet') return ({Hoch:0,Normal:1,Niedrig:2}[a.prioritaet as 'Hoch'|'Normal'|'Niedrig']??1)-({Hoch:0,Normal:1,Niedrig:2}[b.prioritaet as 'Hoch'|'Normal'|'Niedrig']??1)
      if(sortBy==='person') return a.person.localeCompare(b.person)
      return new Date(b.created_at).getTime()-new Date(a.created_at).getTime()
    })
    const exportCSV=()=>{
      const rows=[['Nummer','Titel','Person','Bereich','Priorität','Status','Deadline','Ergebnis']]
      gefiltert.forEach(a=>rows.push([
        String(a.nummer||''),a.titel,a.person,a.projekt,a.prioritaet,a.status,a.deadline||'',a.ergebnis
      ]))
      const csv=rows.map(r=>r.map(v=>'"'+v.replace(/"/g,'""')+'"').join(',')).join('\n')
      const blob=new Blob([csv],{type:'text/csv'})
      const url=URL.createObjectURL(blob)
      const link=document.createElement('a')
      link.href=url; link.download=`quadras-aufgaben-${new Date().toISOString().split('T')[0]}.csv`
      link.click(); URL.revokeObjectURL(url)
    }
    return (
      <div>
        <div className="page-head">
          <div><div className="page-title">Aufgaben</div><div className="page-sub">{gefiltert.length} Aufgaben · <kbd className="kbd">N</kbd> neue Aufgabe</div></div>
          <div style={{display:'flex',gap:'var(--sp2)'}}>
            <button className="btn btn-secondary" onClick={exportCSV} title="Als CSV exportieren">↓ CSV</button>
            <button className="btn btn-primary" onClick={()=>{setEditA(null);setModal('aufgabe')}}>{Ico.plus} Neue Aufgabe</button>
          </div>
        </div>
        <div className="filter-row"><span className="filter-lbl">Person</span>{['Alle',...PERSONEN.map(p=>p.name)].map(p=><button key={p} className={`chip${fPerson===p?' on':''}`} onClick={()=>setFPerson(p)}>{p}</button>)}</div>
        <div className="filter-row"><span className="filter-lbl">Bereich</span>{['Alle',...PROJEKTE].map(p=><button key={p} className={`chip${fProjekt===p?' on':''}`} onClick={()=>setFProjekt(p)}>{p}</button>)}</div>
        <div className="filter-row"><span className="filter-lbl">Status</span>{['Alle',...STATUSES].map(s=><button key={s} className={`chip${fStatus===s?' on':''}`} onClick={()=>setFStatus(s)}>{s}</button>)}</div>
        <div className="filter-row" style={{marginBottom:'var(--sp5)'}}><span className="filter-lbl">Sortierung</span>{([['created','Neueste'],['deadline','Deadline'],['prioritaet','Priorität'],['person','Person']] as const).map(([k,l])=><button key={k} className={`chip${sortBy===k?' on':''}`} onClick={()=>setSortBy(k)}>{l}</button>)}</div>
        <div className="card">
          {loading?<SkeletonList rows={6}/>:sorted.length===0?<div className="empty"><div className="empty-icon">{Ico.empty}</div><div className="empty-title">Keine Aufgaben</div><div className="empty-sub" style={{marginBottom:'var(--sp4)'}}>Filter anpassen oder neue Aufgabe anlegen</div><button className="btn btn-primary btn-sm" onClick={()=>{setEditA(null);setModal('aufgabe')}}>+ Neue Aufgabe</button></div>
            :sorted.map(a=><AItem key={a.id} a={a} editable/>)}
        </div>
      </div>
    )
  }

  function DesignView() {
    const fgColor=(s:string)=>s==='Freigegeben'?'var(--signal)':s==='Abgelehnt'?'var(--red)':s==='Überarbeiten'?'var(--amber)':'var(--muted)'
    return (
      <div>
        <div className="page-head">
          <div><div className="page-title">Design Studio</div><div className="page-sub">Patches · Frames · Hangtags · Verpackung · {ideen.length} Ideen · <kbd className="kbd">D</kbd></div></div>
          <button className="btn btn-primary" onClick={()=>{setEditD(null);setModal('design')}}>{Ico.plus} Neue Idee</button>
        </div>
        <div className="filter-row"><span className="filter-lbl">Kategorie</span>{['Alle',...DESIGN_KATS].map(k=><button key={k} className={`chip${fDKat===k?' on':''}`} onClick={()=>setFDKat(k)}>{k}</button>)}</div>
        <div className="filter-row" style={{marginBottom:'var(--sp5)'}}><span className="filter-lbl">Freigabe</span>{['Alle',...FREIGABE_STATUS].map(s=><button key={s} className={`chip${fDFG===s?' on':''}`} onClick={()=>setFDFG(s)}>{s}</button>)}</div>
        {loading?<div className="design-grid">{Array.from({length:4}).map((_,i)=><div key={i} className="card"><div className="skeleton" style={{paddingTop:'var(--patch-ratio)',display:'block'}}/><div style={{padding:'var(--sp3)'}}><div className="skeleton skeleton-title"/><div className="skeleton skeleton-meta"/></div></div>)}</div>
          :gefilterteIdeen.length===0?<div className="card"><div className="empty"><div className="empty-icon">{Ico.design}</div><div className="empty-title">Noch keine Ideen</div><div className="empty-sub" style={{marginBottom:'var(--sp4)'}}>Patch-Ideen und Design-Entwürfe hochladen</div><button className="btn btn-primary btn-sm" onClick={()=>{setEditD(null);setModal('design')}}>+ Erste Idee hinzufügen</button></div></div>
          :<div className="design-grid">
            {gefilterteIdeen.map(idee=>(
              <div className="design-card" key={idee.id} onClick={()=>setDesignFlyout(idee)}>
                <div style={{padding:'var(--sp2) var(--sp2) 0'}}>
                  <div className="patch-preview">
                    {idee.url&&idee.url.startsWith('https://')?<img src={idee.url} alt={idee.titel} loading="lazy"/>:<div className="patch-preview-placeholder">{idee.kategorie}</div>}
                  </div>
                </div>
                <div className="design-info">
                  {idee.freigabe==='Überarbeiten'&&<div className="badge-overarbeiten">Überarbeiten</div>}
                  <div className="design-title">{idee.titel}</div>
                  <div className="design-meta">{idee.kategorie} · {idee.von}</div>
                  <div style={{display:'flex',gap:'var(--sp1)',alignItems:'center',justifyContent:'space-between',marginBottom:'var(--sp2)'}}>
                    <span className="tag tag-neutral" style={{fontSize:'var(--text-xs)'}}>{idee.status}</span>
                    <span style={{fontSize:'var(--text-sm)',fontWeight:700,color:fgColor(idee.freigabe)}}>{idee.freigabe}</span>
                  </div>
                  <div className="design-actions" onClick={e=>e.stopPropagation()}>
                    <button className="btn btn-xs btn-signal" onClick={()=>updateFreigabe(idee,'Freigegeben')}>Freigabe</button>
                    <button className="btn btn-xs btn-amber" onClick={()=>updateFreigabe(idee,'Überarbeiten')}>Revision</button>
                  </div>
                  {(idee.feedback_json||[]).length>0&&(
                    <div className="design-fb-item" onClick={e=>e.stopPropagation()}>
                      <div className="design-fb-meta">{idee.feedback_json[idee.feedback_json.length-1].person}</div>
                      {idee.feedback_json[idee.feedback_json.length-1].text}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>}
      </div>
    )
  }

  function DateienView() {
    const [fP,setFP]=useState('Alle')
    const gef=dateien.filter(d=>fP==='Alle'||d.projekt===fP)
    return (
      <div>
        <div className="page-head">
          <div><div className="page-title">Dateien</div><div className="page-sub">Tech Packs · Angebote · Dokumente · {dateien.length} Dateien</div></div>
          <button className="btn btn-primary" onClick={()=>setModal('datei')}>{Ico.plus} Hochladen</button>
        </div>
        <div className="filter-row" style={{marginBottom:'var(--sp5)'}}>{['Alle',...PROJEKTE].map(p=><button key={p} className={`chip${fP===p?' on':''}`} onClick={()=>setFP(p)}>{p}</button>)}</div>
        <div className="card">
          {loading?<SkeletonList rows={4}/>:gef.length===0?<div className="empty"><div className="empty-icon">{Ico.files}</div><div className="empty-title">Noch keine Dateien</div><div className="empty-sub">Tech Packs, Angebote, Bilder hochladen</div></div>
            :gef.map(d=>(
              <div className="file-row" key={d.id}>
                <div className="file-icon">{d.dateiname.match(/\.(jpe?g|png|gif|webp)$/i)?Ico.img:Ico.file}</div>
                <div className="file-info"><div className="file-name">{d.name}</div><div className="file-meta">{d.projekt} · {d.hochgeladen_von} · {fmtDate(d.created_at.split('T')[0])} · {Math.round(d.groesse/1024)}KB</div></div>
                <div className="file-actions">
                  <a href={d.url.startsWith('https://')?d.url:'#'} target="_blank" rel="noopener noreferrer" style={{textDecoration:'none'}}><button className="btn btn-secondary btn-sm">Download</button></a>
                  <button className="icon-btn del" onClick={()=>delDatei(d)}>{Ico.trash}</button>
                </div>
              </div>
            ))}
        </div>
      </div> 
    )
  }

  function EntscheidungenView() {
    return (
      <div>
        <div className="page-head">
          <div><div className="page-title">Entscheidungen</div><div className="page-sub">Was wurde entschieden — und warum · {entscheid.length} Einträge</div></div>
          <button className="btn btn-primary" onClick={()=>setModal('entscheidung')}>{Ico.plus} Entscheidung</button>
        </div>
        <div className="card">
          {loading?<SkeletonList rows={4}/>:entscheid.length===0?<div className="empty"><div className="empty-icon">{Ico.decide}</div><div className="empty-title">Noch keine Entscheidungen</div><div className="empty-sub" style={{marginBottom:'var(--sp4)'}}>Jede wichtige Entscheidung festhalten</div><button className="btn btn-primary btn-sm" onClick={()=>setModal('entscheidung')}>+ Erste Entscheidung</button></div>
            :entscheid.map(e=>(
              <div className="decision-row" key={e.id}>
                <div className="decision-title">{e.titel}</div>
                {e.begruendung&&<div className="decision-why">{e.begruendung}</div>}
                {e.naechster_schritt&&<div className="decision-next">→ {e.naechster_schritt}</div>}
                <div className="decision-meta">
                  <span className="tag tag-proj">{e.projekt}</span>
                  <span className="tag tag-person" style={{background:PERSON_HEX[e.person]||'var(--slate)'}}>{e.person}</span>
                  <span style={{fontSize:'var(--text-xs)',color:'var(--muted)'}}>{fmtDate(e.datum)}</span>
                  <button className="icon-btn del" style={{marginLeft:'auto'}} onClick={()=>delEntscheid(e)}>{Ico.trash}</button>
                </div>
              </div>
            ))}
        </div>
      </div>
    )
  }

  const navItems=[
    {id:'heute' as const,icon:Ico.heute,label:'Heute',kbd:'H'},
    {id:'plan' as const,icon:Ico.plan,label:'Launch Plan',kbd:'P'},
    {id:'aufgaben' as const,icon:Ico.aufg,label:'Aufgaben',kbd:'N'},
    {id:'design' as const,icon:Ico.design,label:'Design Studio',kbd:'D'},
    {id:'dateien' as const,icon:Ico.files,label:'Dateien',kbd:''},
    {id:'entscheidungen' as const,icon:Ico.decide,label:'Entscheidungen',kbd:''},
  ]
  const ap=PERSONEN.find(p=>p.name===aktiv)!

  if(!authChecked) return <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{fontSize:'var(--text-sm)',color:'var(--muted)'}}>Laden…</div></div>
  if(!authed) return <LoginScreen onLogin={(name)=>{setAktiv(name);setAuthed(true)}}/>

  return (
    <div className="app">
      <aside className={`sidebar${sidebarOpen?' open':''}`}>
        <div className="sidebar-logo" style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
          <div>
            <div className="sidebar-logo-name">Quadras</div>
            <div className="sidebar-logo-sub">Founder Operating System</div>
          </div>
          <NotificationCenter/>
        </div>

        <nav className="nav">
          <div className="nav-section">Navigation</div>
          {navItems.map(n=>(
            <button key={n.id} className={`nav-item${view===n.id?' active':''}`} onClick={()=>{setView(n.id);setSidebarOpen(false)}}>
              <span className="nav-icon">{n.icon}</span>
              {n.label}
              {n.kbd&&<kbd className="kbd" style={{marginLeft:'auto',opacity:0.5}}>{n.kbd}</kbd>}
            </button>
          ))}
        </nav>
        <div className="sidebar-stats">
          <div className="stat"><div className="stat-num" style={{color:meineOffen>0?PERSON_HEX[aktiv]:'var(--ink)'}}>{meineOffen}</div><div className="stat-label">Meine</div></div>
          <div className="stat"><div className="stat-num">{offenGesamt}</div><div className="stat-label">Team</div></div>
          <div className="stat"><div className="stat-num" style={{color:ueberfaellig>0?'var(--red)':'var(--ink)'}}>{ueberfaellig}</div><div className="stat-label">Überfällig</div></div>
        </div>
        <button style={{margin:'0 var(--sp4) var(--sp4)',padding:'var(--sp2)',borderRadius:'var(--r-sm)',border:'1px solid var(--border)',background:'none',color:'var(--muted)',fontSize:'var(--text-xs)',cursor:'pointer',fontFamily:'var(--font)',width:'calc(100% - var(--sp8))',textAlign:'center'}}
          onClick={async()=>{await supabase.auth.signOut();setAuthed(false)}}>
          Abmelden
        </button>
      </aside>

      <main className="main">
        {view==='heute'&&<HeuteView/>}
        {view==='plan'&&<PlanView/>}
        {view==='aufgaben'&&<AufgabenView/>}
        {view==='design'&&<DesignView/>}
        {view==='dateien'&&<DateienView/>}
        {view==='entscheidungen'&&<EntscheidungenView/>}
      </main>

      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          {navItems.slice(0,5).map(n=>(
            <button key={n.id} className={`mobile-nav-btn${view===n.id?' active':''}`} onClick={()=>setView(n.id)}>
              {n.icon}<span className="mobile-nav-label">{n.label.split(' ')[0]}</span>
            </button>
          ))}
          <button className="mobile-nav-btn" style={{position:'relative'}} onClick={()=>setSidebarOpen(o=>!o)}>
            {Ico.menu}
            {notifications.filter(n=>!n.gelesen).length>0&&<div style={{position:'absolute',top:4,right:8,width:8,height:8,borderRadius:'50%',background:'var(--red)',border:'1.5px solid var(--bg)'}}/>}
            <span className="mobile-nav-label">Mehr</span>
          </button>
        </div>
      </nav>

      {flyout&&<TaskFlyout/>}
      {designFlyout&&<DesignStudioFlyout/>}
      {modal==='aufgabe'&&<AufgabeModal/>}
      {modal==='entscheidung'&&<EntscheidungModal/>}
      {modal==='datei'&&<DateiModal/>}
      {modal==='design'&&<DesignModal/>}
      {modal==='confirm'&&<ConfirmModal/>}
      {cmdOpen&&<CommandCenter/>}
      {focusTask&&<FocusMode task={focusTask}/>}

      <div className="toast-container">
        {toasts.map(t=><div key={t.id} className={`toast${t.type==='success'?' success':t.type==='error'?' error':''}`}>{t.msg}</div>)}
      </div>
    </div>
    )
  }

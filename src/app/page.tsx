'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  supabase, PERSONEN, PROJEKTE, PRIOS, STATUSES,
  DESIGN_KATS, DESIGN_STATUS, FREIGABE_STATUS, PERSON_HEX, PRIO_HEX,
  Aufgabe, Entscheidung, Datei, DesignIdee, Comment, FeedbackEntry,
  todayStr, in48hStr, in7dStr, isOverdue, isSoon, safeDate, fmtDate,
  logActivity, type PersonName
} from '../lib/supabase'

type View = 'heute'|'plan'|'aufgaben'|'design'|'dateien'|'entscheidungen'
type Toast = { id:number; msg:string; type:'default'|'success'|'error' }
type ActivityEntry = { id:string; entity_type:string; entity_titel:string; action:string; person:string; created_at:string }
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

export default function App() {
  const [view,        setView]        = useState<View>('heute')
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

  useEffect(()=>{ loadAll() },[loadAll])

  // Optimised realtime — diff injection
  useEffect(()=>{
    const ch=supabase.channel('quadras-v7')
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
      if(e.key==='Escape'){ setModal(null); setFlyout(null); setDesignFlyout(null); setSidebarOpen(false) }
      if(modal||flyout||designFlyout) return
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
  const meineOffen=aufgaben.filter(a=>a.person===aktiv&&a.status!=='Erledigt').length
  const offenGesamt=aufgaben.filter(a=>a.status!=='Erledigt').length
  const ueberfaellig=aufgaben.filter(a=>isOverdue(a.deadline,a.status)).length
  const meineFokus=aufgaben.filter(a=>a.person===aktiv&&a.status!=='Erledigt'&&!a.parent_id)
    .sort((a,b)=>({Hoch:0,Normal:1,Niedrig:2}[a.prioritaet as 'Hoch'|'Normal'|'Niedrig']??1)-({Hoch:0,Normal:1,Niedrig:2}[b.prioritaet as 'Hoch'|'Normal'|'Niedrig']??1))
    .slice(0,3)
  const hauptaufgaben=aufgaben.filter(a=>a.ist_hauptaufgabe)
  const phasen=[...new Set(hauptaufgaben.map(a=>a.phase))].sort()
  const meineGesamt=aufgaben.filter(a=>a.person===aktiv).length
  const meineDone=aufgaben.filter(a=>a.person===aktiv&&a.status==='Erledigt').length
  const donePct=meineGesamt>0?Math.round(meineDone/meineGesamt*100):0
  const naechste7=aufgaben.filter(a=>a.deadline&&a.deadline>=t&&a.deadline<=h7&&a.status!=='Erledigt').sort((a,b)=>(a.deadline||'').localeCompare(b.deadline||''))
  const weekDays=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i);return d.toISOString().split('T')[0]})
  const gefiltert=aufgaben.filter(a=>{
    if(fPerson!=='Alle'&&a.person!==fPerson) return false
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
  function AItem({a,editable=false,compact=false}:{a:Aufgabe;editable?:boolean;compact?:boolean}) {
    const ov=isOverdue(a.deadline,a.status)
    const sn=isSoon(a.deadline,a.status)
    const metaParts=[a.person,a.projekt,a.deadline?fmtDate(a.deadline):''].filter(Boolean)
    return (
      <div className={`aufgabe${a.status==='Erledigt'?' done':''}${ov?' critical':''}`}>
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

    const addComment=async()=>{
      if(!newComment.trim()) return
      const payload={aufgabe_id:a.id,person:aktiv,kommentar:newComment.trim()}
      setComments(prev=>[...prev,{...payload,id:'tmp-'+Date.now(),created_at:new Date().toISOString()}])
      setNewComment('')
      await supabase.from('aufgabe_comments').insert(payload)
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
                <span style={{color:PERSON_HEX[a.person]||'var(--mid)',fontWeight:600}}>{a.person}</span>
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
                    <div className="comment-text">{c.kommentar}</div>
                  </div>
                ))
              }
              <div className="comment-form">
                <input className="form-input" style={{fontSize:'var(--text-sm)'}} placeholder="Kommentar..." value={newComment}
                  onChange={e=>setNewComment(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();addComment()}}}/>
                <button className="btn btn-primary btn-sm" onClick={addComment}>Senden</button>
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
    const [f,setF]=useState({titel:editA?.titel||'',beschreibung:editA?.beschreibung||'',person:editA?.person||aktiv,projekt:editA?.projekt||PROJEKTE[0],prioritaet:editA?.prioritaet||'Normal',status:editA?.status||'Offen',deadline:editA?.deadline||'',ergebnis:editA?.ergebnis||'',blocker:editA?.blocker||''})
    const [errors,setErrors]=useState<Record<string,string>>({})
    const [saving,setSaving]=useState(false)
    const up=(k:string,v:string)=>{setF(p=>({...p,[k]:v}));setErrors(e=>({...e,[k]:''})) }
    const validate=()=>{
      const e:Record<string,string>={}
      if(!f.titel.trim()) e.titel='Bitte Aufgabe eingeben'
      if(!f.deadline) e.deadline='Deadline ist Pflichtfeld'
      if(!f.ergebnis.trim()) e.ergebnis='Gewünschtes Ergebnis ist Pflichtfeld'
      setErrors(e); return Object.keys(e).length===0
    }
    const save=async()=>{
      if(!validate()) return; setSaving(true)
      const data={...f,deadline:safeDate(f.deadline),beschreibung:f.beschreibung||'',blocker:f.blocker||''}
      if(isEdit){
        const {error}=await supabase.from('aufgaben').update(data).eq('id',editA!.id)
        if(error){toast('Fehler: '+error.message,'error');setSaving(false);return}
        await logActivity('aufgabe',editA!.id,f.titel,'aktualisiert',aktiv); toast('Aktualisiert','success')
      } else {
        const {data:ins,error}=await supabase.from('aufgaben').insert(data).select().single()
        if(error){toast('Fehler: '+error.message,'error');setSaving(false);return}
        if(ins) await logActivity('aufgabe',ins.id,f.titel,'erstellt',aktiv); toast('Erstellt','success')
      }
      setSaving(false);setModal(null);setEditA(null)
    }
    return (
      <div className="overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
        <div className="modal">
          <div className="modal-header"><span className="modal-title">{isEdit?'Aufgabe bearbeiten':'Neue Aufgabe'}</span><button className="modal-close" onClick={()=>setModal(null)}>{Ico.x}</button></div>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Aufgabe *</label><input autoFocus required className={`form-input${errors.titel?' error':''}`} placeholder="Aktionsverb + konkretes Ziel" value={f.titel} onChange={e=>up('titel',e.target.value)}/>{errors.titel&&<div className="form-error">{errors.titel}</div>}</div>
            <div className="form-group"><label className="form-label">Details</label><textarea className="form-input" placeholder="Kontext, Links, Hinweise..." value={f.beschreibung} onChange={e=>up('beschreibung',e.target.value)}/></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Verantwortlich *</label><select required className="form-input" value={f.person} onChange={e=>up('person',e.target.value)}>{PERSONEN.map(p=><option key={p.name}>{p.name}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Priorität</label><select className="form-input" value={f.prioritaet} onChange={e=>up('prioritaet',e.target.value)}>{PRIOS.map(p=><option key={p}>{p}</option>)}</select></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Bereich *</label><select required className="form-input" value={f.projekt} onChange={e=>up('projekt',e.target.value)}>{PROJEKTE.map(p=><option key={p}>{p}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Deadline *</label><input type="date" required min={todayStr()} className={`form-input${errors.deadline?' error':''}`} value={f.deadline} onChange={e=>up('deadline',e.target.value)}/>{errors.deadline&&<div className="form-error">{errors.deadline}</div>}</div>
            </div>
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
    return (
      <div>
        <div className="cockpit-hero">
          <div className="cockpit-role"><div className="cockpit-dot" style={{background:PERSON_HEX[aktiv]}}/>{ap.role}</div>
          <div className="cockpit-name">{aktiv}</div>
          <div className="cockpit-meta">
            {new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
            {ueberfaellig>0&&<span className="cockpit-critical-tag">· {ueberfaellig} überfällig</span>}
          </div>
        </div>

        {/* Launch Barometer */}
        <div className="launch-bar">
          <div className="launch-bar-header"><span className="launch-bar-lbl">Launch-Fortschritt</span><span className="launch-bar-score">{hauptaufgaben.filter(a=>a.status==='Erledigt').length} / {hauptaufgaben.length}</span></div>
          <div className="launch-bar-phases">
            {phasen.map(phase=>{
              const items=hauptaufgaben.filter(a=>a.phase===phase)
              const pct=items.length?Math.round(items.filter(a=>a.status==='Erledigt').length/items.length*100):0
              return <div key={phase} className="launch-bar-phase" title={`${phase}: ${pct}%`}><div className="launch-bar-phase-fill" style={{width:`${pct}%`}}/></div>
            })}
          </div>
          <div className="launch-bar-sublabels">{phasen.map(p=><div key={p} className="launch-bar-sublabel">{p.split('·')[1]?.trim()}</div>)}</div>
        </div>

        {/* Metrics */}
        <div className="metrics-row">
          <div className="metric"><div className="metric-num" style={{color:PERSON_HEX[aktiv]}}>{meineOffen}</div><div className="metric-lbl">Meine offenen</div><div className="metric-bar"><div className="metric-bar-fill" style={{width:`${donePct}%`,background:PERSON_HEX[aktiv]}}/></div></div>
          <div className="metric"><div className="metric-num" style={{color:ueberfaellig>0?'var(--red)':'var(--signal)'}}>{ueberfaellig}</div><div className="metric-lbl">Überfällig</div></div>
          <div className="metric"><div className="metric-num">{naechste7.length}</div><div className="metric-lbl">Nächste 7 Tage</div></div>
          <div className="metric"><div className="metric-num c-signal">{donePct}%</div><div className="metric-lbl">Mein Fortschritt</div></div>
        </div>

        {/* 7-day timeline */}
        {naechste7.length>0&&(
          <div className="card" style={{marginBottom:'var(--sp4)'}}>
            <div className="cockpit-section-lbl">Nächste 7 Tage</div>
            <div className="week-timeline">
              {weekDays.map(day=>{
                const dayTasks=naechste7.filter(a=>a.deadline===day)
                return (
                  <div key={day} className={`week-day${day===t?' today':''}`}>
                    <div className="week-day-label">{new Date(day+'T12:00').toLocaleDateString('de-DE',{weekday:'short'})}</div>
                    <div className="week-day-date">{new Date(day+'T12:00').getDate()}</div>
                    <div className="week-day-tasks">
                      {dayTasks.map(a=>(
                        <div key={a.id} className="week-day-task-dot" title={`${a.titel} · ${a.person}`}
                          style={{background:PERSON_HEX[a.person]||'var(--slate)'}} onClick={()=>setFlyout(a)}>
                          {a.person[0]}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Critical + Focus */}
        <div className="cockpit-grid">
          <div className="card">
            {kritisch.length>0?<div className="cockpit-critical-lbl">Kritisch ({kritisch.length})</div>:<div className="cockpit-section-lbl">Kein kritischer Pfad</div>}
            {loading?<SkeletonList rows={2}/>:kritisch.length===0?<div className="empty"><div className="empty-title c-signal">Alles im grünen Bereich</div></div>:kritisch.slice(0,5).map(a=><AItem key={a.id} a={a} editable/>)}
          </div>
          <div className="card">
            <div className="cockpit-section-lbl">Mein Fokus — Top 3</div>
            {loading?<SkeletonList rows={3}/>:meineFokus.length===0?<div className="empty"><div className="empty-title c-signal">Keine offenen Aufgaben</div></div>:meineFokus.map(a=><AItem key={a.id} a={a} editable/>)}
          </div>
        </div>

        {/* Area status overview */}
        {areaStats.length>0&&(
          <>
            <div style={{fontSize:'var(--text-md)',fontWeight:700,marginBottom:'var(--sp3)',color:'var(--ink)'}}>Bereichsstatus</div>
            <div className="area-grid" style={{marginBottom:'var(--sp5)'}}>
              {areaStats.map(a=>{
                const pct=a.total>0?Math.round(a.done/a.total*100):0
                return (
                  <div key={a.proj} className="area-card" onClick={()=>{setFProjekt(a.proj);setView('aufgaben')}}>
                    <div className="area-name" title={a.proj}>{a.proj}</div>
                    <div className="area-stats">
                      {a.offen} offen{a.krit>0&&<span style={{color:'var(--red)',marginLeft:'var(--sp2)',fontWeight:700}}>· {a.krit} kritisch</span>}
                    </div>
                    <div className="area-bar">
                      <div className="area-bar-fill" style={{width:`${pct}%`,background:a.krit>0?'var(--red)':a.offen===0?'var(--signal)':'var(--slate)'}}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Team */}
        <div style={{fontSize:'var(--text-md)',fontWeight:700,marginBottom:'var(--sp3)',color:'var(--ink)'}}>Team</div>
        <div className="team-grid" style={{marginBottom:'var(--sp5)'}}>
          {PERSONEN.map(p=>{
            const pA=aufgaben.filter(a=>a.person===p.name&&a.status!=='Erledigt'&&!a.parent_id)
            const pDone=aufgaben.filter(a=>a.person===p.name&&a.status==='Erledigt').length
            const pTotal=aufgaben.filter(a=>a.person===p.name).length
            const pPct=pTotal>0?Math.round(pDone/pTotal*100):0
            return (
              <div className="team-card" key={p.name}>
                <div className="team-card-head">
                  <div><div className="team-card-name" style={{color:PERSON_HEX[p.name]}}>{p.name}</div><div className="team-card-role">{p.role}</div></div>
                  <div className="team-card-stats"><div style={{fontWeight:700}}>{pPct}%</div><div>{pA.length} offen</div></div>
                </div>
                <div className="metric-bar" style={{margin:'0 var(--sp4) var(--sp1)',borderRadius:1}}>
                  <div className="metric-bar-fill" style={{width:`${pPct}%`,background:PERSON_HEX[p.name]}}/>
                </div>
                {pA.slice(0,3).map(a=><div className="team-task" key={a.id}><div className="team-task-title">{a.titel}</div><div className="team-task-meta">{a.projekt}{a.deadline?` · bis ${fmtDate(a.deadline)}`:''}</div></div>)}
                {pA.length===0&&<div style={{padding:'var(--sp3) var(--sp4)',fontSize:'var(--text-sm)',color:'var(--muted)'}}>Alles erledigt</div>}
                {pA.length>3&&<div style={{padding:'var(--sp2) var(--sp4)',fontSize:'var(--text-xs)',color:'var(--muted)'}}>+ {pA.length-3} weitere</div>}
              </div>
            )
          })}
        </div>

        {/* Activity Log */}
        {activity.length>0&&(
          <div className="card">
            <div className="cockpit-section-lbl">Letzte Aktivität</div>
            {activity.slice(0,8).map(a=>(
              <div key={a.id} className="activity-item">
                <div className="activity-dot" style={{background:PERSON_HEX[a.person]||'var(--muted)'}}/>
                <div className="activity-text">
                  <span style={{fontWeight:600,color:PERSON_HEX[a.person]||'var(--slate)'}}>{a.person}</span>{' '}hat <em>{a.entity_titel}</em> {a.action}
                </div>
                <div className="activity-time">{new Date(a.created_at).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
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
    return (
      <div>
        <div className="page-head">
          <div><div className="page-title">Launch Plan</div><div className="page-sub">20 Hauptaufgaben · {gesamtDone}/{hauptaufgaben.length} · Klick auf Aufgabe für Unteraufgaben · <kbd className="kbd">P</kbd></div></div>
          <button className="btn btn-primary" onClick={()=>{setEditA(null);setModal('aufgabe')}}>{Ico.plus} Aufgabe</button>
        </div>
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
    return (
      <div>
        <div className="page-head">
          <div><div className="page-title">Aufgaben</div><div className="page-sub">{gefiltert.length} Aufgaben · <kbd className="kbd">N</kbd> neue Aufgabe</div></div>
          <button className="btn btn-primary" onClick={()=>{setEditA(null);setModal('aufgabe')}}>{Ico.plus} Neue Aufgabe</button>
        </div>
        <div className="filter-row"><span className="filter-lbl">Person</span>{['Alle',...PERSONEN.map(p=>p.name)].map(p=><button key={p} className={`chip${fPerson===p?' on':''}`} onClick={()=>setFPerson(p)}>{p}</button>)}</div>
        <div className="filter-row"><span className="filter-lbl">Bereich</span>{['Alle',...PROJEKTE].map(p=><button key={p} className={`chip${fProjekt===p?' on':''}`} onClick={()=>setFProjekt(p)}>{p}</button>)}</div>
        <div className="filter-row" style={{marginBottom:'var(--sp5)'}}><span className="filter-lbl">Status</span>{['Alle',...STATUSES].map(s=><button key={s} className={`chip${fStatus===s?' on':''}`} onClick={()=>setFStatus(s)}>{s}</button>)}</div>
        <div className="card">
          {loading?<SkeletonList rows={6}/>:gefiltert.filter(a=>!a.parent_id||fStatus!=='Alle').length===0?<div className="empty"><div className="empty-icon">{Ico.empty}</div><div className="empty-title">Keine Aufgaben</div><div className="empty-sub">Filter anpassen oder neue Aufgabe anlegen</div></div>
            :gefiltert.map(a=><AItem key={a.id} a={a} editable/>)}
        </div>
      </div>
    )
  }

  function DesignView() {
    const [feedbackText,setFeedbackText]=useState<Record<string,string>>({})
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
          :gefilterteIdeen.length===0?<div className="card"><div className="empty"><div className="empty-icon">{Ico.design}</div><div className="empty-title">Noch keine Ideen</div><div className="empty-sub">Norman lädt hier Patch-Ideen und Design-Entwürfe hoch</div></div></div>
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
          {loading?<SkeletonList rows={4}/>:entscheid.length===0?<div className="empty"><div className="empty-icon">{Ico.decide}</div><div className="empty-title">Noch keine Entscheidungen</div><div className="empty-sub">Jede wichtige Entscheidung hier festhalten</div></div>
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

  return (
    <div className="app">
      <aside className={`sidebar${sidebarOpen?' open':''}`}>
        <div className="sidebar-logo"><div className="sidebar-logo-name">Quadras</div><div className="sidebar-logo-sub">Founder Operating System</div></div>
        <div className="person-block">
          <div className="person-label">Aktive Person</div>
          <div className="person-btns">
            {PERSONEN.map(p=>(
              <button key={p.name} className={`pbtn${aktiv===p.name?' active':''}`}
                style={aktiv===p.name?{background:PERSON_HEX[p.name],borderColor:PERSON_HEX[p.name]}:{}}
                onClick={()=>{setAktiv(p.name);setSidebarOpen(false)}}>{p.name[0]}</button>
            ))}
          </div>
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
          <button className="mobile-nav-btn" onClick={()=>setSidebarOpen(o=>!o)}>{Ico.menu}<span className="mobile-nav-label">Mehr</span></button>
        </div>
      </nav>

      {flyout&&<TaskFlyout/>}
      {designFlyout&&<DesignStudioFlyout/>}
      {modal==='aufgabe'&&<AufgabeModal/>}
      {modal==='entscheidung'&&<EntscheidungModal/>}
      {modal==='datei'&&<DateiModal/>}
      {modal==='design'&&<DesignModal/>}
      {modal==='confirm'&&<ConfirmModal/>}

      <div className="toast-container">
        {toasts.map(t=><div key={t.id} className={`toast${t.type==='success'?' success':t.type==='error'?' error':''}`}>{t.msg}</div>)}
      </div>
    </div>
  )
}

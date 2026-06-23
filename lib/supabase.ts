import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const PERSONEN = [
  { name: 'Alexander' as const, role: 'Product · Webseite',  color: 'var(--person-alexander)' },
  { name: 'Norman'    as const, role: 'Design · Content',          color: 'var(--person-norman)' },
  { name: 'Anna'      as const, role: 'Supply Chain',   color: 'var(--person-anna)' },
]
export type PersonName = 'Alexander' | 'Norman' | 'Anna'

// FIX: Farben mit ausreichend Kontrast auf hellem UND dunklem Hintergrund
// Alexander: Kräftiges Blau (vorher #1A2028 = fast schwarz, kaum von Hintergrund zu unterscheiden)
// Norman: Sattes Grün (passt zur QUADRAS Brand)
// Anna: Rot bleibt, war schon gut
export const PERSON_HEX: Record<string,string> = {
  Alexander: '#2563EB',   // Kräftiges Blau — sichtbar auf Cream & Dark
  Norman:    '#16A34A',   // Sattes Grün — passt zu Signal-Farbe
  Anna:      '#DC2626',   // Kräftiges Rot — gut lesbar
}

export const PROJEKTE = [
  'Cap','Patch / Frame','Packaging','Website / Shop',
  'Content / Social Media','Newsletter','Lieferanten',
  'Finanzen','Rechtliches','Brand','Organisation',
] as const

export const PRIOS          = ['Hoch','Normal','Niedrig'] as const
export const STATUSES       = ['Offen','In Arbeit','Erledigt'] as const
export const DESIGN_KATS    = ['Patch Idee','Frame Design','Hangtag','Verpackung','Logo Variante','Sonstiges'] as const
export const DESIGN_STATUS  = ['Idee','In Arbeit','Feedback ausstehend','Freigegeben','Abgelehnt'] as const
export const FREIGABE_STATUS= ['Offen','Freigegeben','Überarbeiten','Abgelehnt'] as const
export const PRIO_HEX: Record<string,string> = { Hoch:'#DC2626', Normal:'#2563EB', Niedrig:'#6B7280' }

export type Aufgabe = {
  id: string; nummer: number|null; titel: string; beschreibung: string
  person: string; personen: string[]; projekt: string; prioritaet: string; status: string
  deadline: string|null; ergebnis: string; phase: string; sortierung: number
  ist_hauptaufgabe: boolean; parent_id: string|null; blocker: string
  completed_at: string|null; created_at: string; updated_at: string
}
export type Entscheidung = {
  id: string; titel: string; begruendung: string; person: string
  projekt: string; datum: string; naechster_schritt: string; created_at: string
}
export type Datei = {
  id: string; name: string; dateiname: string; projekt: string
  hochgeladen_von: string; url: string; groesse: number; created_at: string
}
export type DesignIdee = {
  id: string; titel: string; kategorie: string; beschreibung: string
  status: string; von: string; dateiname: string; url: string
  freigabe: string; feedback_json: FeedbackEntry[]; created_at: string
}
export type FeedbackEntry = { person: string; text: string; datum: string }
export type Comment = {
  id: string; aufgabe_id: string; person: string; kommentar: string
  anhang_url: string; anhang_name: string; anhang_typ: string; created_at: string
}
export type Notification = {
  id: string; fuer: string; von: string; typ: string; titel: string
  nachricht: string; entity_id: string|null; entity_typ: string
  gelesen: boolean; created_at: string
}

// Helpers
export const todayStr  = () => new Date().toISOString().split('T')[0]
export const in48hStr  = () => { const d=new Date(); d.setHours(d.getHours()+48); return d.toISOString().split('T')[0] }
export const in7dStr   = () => { const d=new Date(); d.setDate(d.getDate()+7);    return d.toISOString().split('T')[0] }
export const isOverdue = (d:string|null, s:string) => !!d && d < todayStr() && s!=='Erledigt'
export const isSoon    = (d:string|null, s:string) => !!d && d >= todayStr() && d <= in48hStr() && s!=='Erledigt'
export const safeDate  = (s:string) => s.trim()==='' ? null : s
export const fmtDate   = (d:string|null) => d ? new Date(d+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'}) : '–'
export const fmtShort  = (d:string|null) => d ? new Date(d+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'numeric'}) : ''

export async function logActivity(entity_type: string, entity_id: string, entity_titel: string, action: string, person: string) {
  await supabase.from('activity_log').insert({ entity_type, entity_id, entity_titel, action, person }).then(()=>{})
}

export async function notifyAll(von: string, typ: string, titel: string, nachricht: string, entity_id?: string, entity_typ?: string) {
  const alle = ['Alexander','Norman','Anna'].filter(p=>p!==von)
  for(const p of alle) {
    await supabase.from('notifications').insert({ fuer:p, von, typ, titel, nachricht, entity_id:entity_id||null, entity_typ:entity_typ||'' })
  }
}

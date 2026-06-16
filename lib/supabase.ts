import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export const OWNERS = ['AT', 'OP', 'DC'] as const
export type Owner = typeof OWNERS[number]

export const STATUS_AUFGABEN = ['Inbox','Heute','Diese Woche','In Arbeit','Wartet extern','Blockiert','Erledigt','Gestrichen'] as const
export const PRIO = ['P0','P1','P2','P3'] as const
export const STATUS_PRODUKT = ['Idee','Konzept','Design','Tech Pack','Supplier gesucht','Sample angefragt','Sample unterwegs','Sample Review','Freigegeben','In Produktion','Launchbereit','Live'] as const
export const STATUS_LIEFERANT = ['Neu','Angeschrieben','Antwort','Call geplant','Sample läuft','Angebot','Aktiv','Backup','Abgelehnt'] as const
export const BEWERTUNG = ['A','B','C','D'] as const
export const STATUS_SAMPLE = ['Angefragt','Bezahlt','In Produktion','Versendet','Angekommen','In Review','Änderungen','Freigegeben','Abgelehnt'] as const
export const STATUS_CONTENT = ['Idee','Skript','In Produktion','Review','Geplant','Live','Ausgewertet'] as const
export const KAT_AUFGABEN = ['Produktentwicklung','Supplier','Sample','Design','Website','Content','Finanzen','Entscheidung','Launch','Rechtliches','Organisation'] as const
export const KAT_FINANZEN = ['Sample','Produktion','Versand','Zoll','Packaging','Website','Tools','Design','Marketing','Rechtliches','Sonstiges'] as const

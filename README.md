# QUADRAS OS — Setup-Anleitung

## Was das ist
Eine vollständige Web-App für das QUADRAS Team (AT, OP, DC).
Alle drei öffnen dieselbe URL und arbeiten auf denselben Daten — in Echtzeit.

## Tech Stack (alles kostenlos)
- **Next.js** — React Web-App
- **Supabase** — Datenbank + Echtzeit-Sync
- **Vercel** — Hosting (oder lokal mit `npm run dev`)

---

## Setup in 5 Schritten (~20 Minuten)

### Schritt 1 — Supabase anlegen (5 Min.)

1. Gehe zu [supabase.com](https://supabase.com) → kostenloser Account
2. "New Project" → Name: `quadras-os` → Passwort merken → Region: Frankfurt
3. Warte bis Projekt fertig ist (~1 Min.)
4. Linkes Menü → **SQL Editor**
5. Den Inhalt von `supabase_schema.sql` komplett reinkopieren → **Run**
6. Grüner Haken = fertig

### Schritt 2 — API Keys kopieren (2 Min.)

In Supabase: **Settings → API**

- **Project URL** → kopieren
- **anon public key** → kopieren

### Schritt 3 — .env.local anlegen (1 Min.)

Im Projektordner die Datei `.env.local.example` kopieren und umbenennen zu `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://DEINE-URL.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=DEIN-ANON-KEY
```

Die zwei Platzhalter durch deine echten Werte ersetzen.

### Schritt 4 — Lokal testen (2 Min.)

```bash
npm install
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) → App läuft.

### Schritt 5 — Auf Vercel deployen (10 Min.)

1. GitHub Account anlegen (falls nicht vorhanden)
2. Projektordner als neues GitHub Repo hochladen
3. Gehe zu [vercel.com](https://vercel.com) → kostenloser Account
4. "Import Project" → dein GitHub Repo auswählen
5. **Environment Variables** eintragen (dieselben wie in .env.local)
6. Deploy → Vercel gibt euch eine URL wie `quadras-os.vercel.app`
7. Diese URL an OP und DC schicken → fertig

---

## Benutzung

### Person wechseln
Oben links in der Sidebar: Dropdown `AT / OP / DC` wählen.
Das steuert welche "Meine Aufgaben" und welches Personal Board angezeigt wird.

### Aufgabe anlegen
- Button `+ Aufgabe` im HQ oder in den Personal Boards
- **5-Punkt-Regel:** Titel mit Aktionsverb · Owner · Deadline · Definition of Done · Kontext
- Alle Pflichtfelder müssen ausgefüllt sein

### Echtzeit-Sync
Wenn OP einen Lieferanten einträgt, sehen AT und DC das sofort — ohne Reload.

---

## Was die App enthält

| Bereich | Inhalt |
|---------|--------|
| HQ Cockpit | Metrics, P0-Aufgaben, Blocker, Überfällige, Sample Review, Supplier Follow-ups, Produktpipeline |
| Board AT | Founder-Fokus: Meine Aufgaben, P0, Entscheidungen, Sample Reviews |
| Board OP | Operations-Fokus: Aufgaben, Supplier Follow-ups, Samples unterwegs |
| Board DC | Design-Fokus: Aufgaben, Content in Produktion, Tech Packs |
| Aufgaben | Vollständige DB mit Filtern: Heute / Woche / P0 / Blockiert / Überfällig |
| Produkte | Kanban-Pipeline durch alle Status |
| Lieferanten | Kanban-Pipeline + Follow-up-Tracking |
| Samples | Kanban + eingebauter Review-Room |
| Content | Kanban-Pipeline |
| Finanzen | Ausgaben-Tracking + Kategorie-Auswertung |
| Entscheidungen | Decision Log |

---

## Fragen?
Einfach Claude fragen — die App kann jederzeit erweitert werden.

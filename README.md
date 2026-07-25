# Rad am Ring Team Live

Hugo-Website fuer drei 4er-Teams beim Rad am Ring 24h-Rennradrennen. Die Seite laeuft statisch auf GitHub Pages, nutzt Firebase optional fuer Admin-Login und Live-Datenpflege und bindet den offiziellen RACEMAP Player ein.

## RACEMAP

Die Livekarte nutzt den offiziellen RACEMAP Player. Die eigene Website speichert Teams, Fahrer und manuelle Rundenzeiten in Firebase; das GPS-Tracking und Favorisieren von Startnummern passiert direkt im eingebetteten RACEMAP Player.

## Lokale Entwicklung

Konfiguration aus Vorlage anlegen:

```powershell
Copy-Item .env.example .env
```

Danach `.env` ausfuellen und fuer lokale Builds in die Shell laden. Beispiel:

```powershell
Get-Content .env | Where-Object { $_ -and $_ -notmatch '^#' } | ForEach-Object {
  $name, $value = $_ -split '=', 2
  Set-Item "env:$name" $value
}
```

```powershell
hugo server
```

Hugo ist in diesem Workspace aktuell nicht installiert. Unter Windows zum Beispiel:

```powershell
winget install Hugo.Hugo.Extended
```

## Firebase Setup

1. Firebase-Projekt anlegen.
2. Authentication mit E-Mail/Passwort aktivieren und Admin-User anlegen.
3. Firebase Web-App-Werte in `.env` eintragen.
4. Admin-User-UID aus Authentication kopieren.
5. In Firestore manuell `admins/{uid}` anlegen, z.B. mit Feld `role = "admin"`.
6. Firestore Rules deployen oder in der Firebase Console einfuegen.

## GitHub Actions Secrets

Fuer GitHub Pages die Werte aus `.env.example` als Repository Secrets oder Variables anlegen. Mindestens:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `RAR_RACEMAP_EVENT_ID`

## GitHub Pages

Die Action in `.github/workflows/hugo.yml` baut `main` automatisch. In GitHub unter Settings -> Pages als Source "GitHub Actions" waehlen.

## Wichtige Eventdaten

- Rad am Ring 2026: 24. bis 26. Juli 2026.
- 24h-Radrennen Start laut Zeitplan: Samstag, 25. Juli 2026, 12:58 Uhr.
- Zielankunft-Fenster: Sonntag, 26. Juli 2026, 12:15 bis 13:30 Uhr.
- Rundenlaenge in der App: 26,23 km.

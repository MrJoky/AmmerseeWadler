# Rad am Ring Team Live

Hugo-Website fuer drei 4er-Teams beim Rad am Ring 24h-Rennradrennen. Die Seite laeuft statisch auf GitHub Pages, nutzt Firebase optional fuer Admin-Login und Live-Datenpflege und kann RACEMAP ueber eine Firebase Function anbinden.

## RACEMAP Einschaetzung

Die RACEMAP Data API fuer Live-Geodaten ist tokenpflichtig. Laut Dokumentation muessen API-Requests einen Bearer Token enthalten; ohne gueltiges Token werden Datenabrufe blockiert. Die Rad-am-Ring-Zuschaueransicht ist dagegen ohne Registrierung nutzbar, aber das ist nicht dasselbe wie freier API-Zugriff fuer eigene Anwendungen.

Konsequenz: Den Token nie in GitHub Pages einbauen. Fuer echte Livepositionen `functions/index.js` deployen und den Secret `RACEMAP_API_TOKEN` in Firebase setzen. Bis dahin nutzt die Website Demo-Positionen und manuell gepflegte Zeiten.

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
4. Dem Admin-User ein Custom Claim `admin: true` geben.
5. Firestore Rules deployen.
6. Optional fuer RACEMAP:

```powershell
firebase functions:secrets:set RACEMAP_API_TOKEN
firebase deploy --only functions,firestore
```

Die Function-URL danach in `layouts/partials/head.html` als `racemapProxyUrl` setzen oder per Hosting-Rewrite unter einem eigenen Pfad erreichbar machen. Auf GitHub Pages muss es in der Praxis meist die volle Firebase-Function-URL sein.

## GitHub Actions Secrets

Fuer GitHub Pages die Werte aus `.env.example` als Repository Secrets oder Variables anlegen. Mindestens:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `RAR_RACEMAP_EVENT_ID`
- `RAR_RACEMAP_PROXY_URL`

Der echte `RACEMAP_API_TOKEN` gehoert nicht in GitHub Pages. Er bleibt als Firebase Functions Secret.

## GitHub Pages

Die Action in `.github/workflows/hugo.yml` baut `main` automatisch. In GitHub unter Settings -> Pages als Source "GitHub Actions" waehlen.

## Wichtige Eventdaten

- Rad am Ring 2026: 24. bis 26. Juli 2026.
- 24h-Radrennen Start laut Zeitplan: Samstag, 25. Juli 2026, 12:58 Uhr.
- Zielankunft-Fenster: Sonntag, 26. Juli 2026, 12:15 bis 13:30 Uhr.
- Vereinfachte Rundenlaenge in der App: 19,6 km.

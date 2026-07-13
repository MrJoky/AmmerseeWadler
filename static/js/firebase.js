let firebaseApp;
let auth;
let db;

export async function getFirebase() {
  if (!window.RAR_CONFIG?.firebaseEnabled) {
    console.info("Firebase ist deaktiviert.");
    return null;
  }
  const config = window.RAR_ENV?.firebase;
  const missing = ["apiKey", "authDomain", "projectId", "appId"].filter(key => !config?.[key]);
  if (missing.length) {
    console.warn(`Firebase-Konfiguration unvollstaendig: ${missing.join(", ")}`);
    return null;
  }

  try {
    const [{ initializeApp }, { getAuth }, { getFirestore }] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js")
    ]);
    firebaseApp = firebaseApp || initializeApp(config);
    auth = auth || getAuth(firebaseApp);
    db = db || getFirestore(firebaseApp);
    return { app: firebaseApp, auth, db };
  } catch (error) {
    console.warn("Firebase ist nicht konfiguriert. Nutze lokale Demo-Daten.", error);
    return null;
  }
}

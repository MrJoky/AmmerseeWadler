import { getFirebase } from "./firebase.js";

const STORAGE_KEY = "rar-team-state";
const DOC_PATH = ["race", "current"];

export async function loadInitialState() {
  const firebase = await getFirebase();
  if (firebase?.db) {
    const { doc, getDoc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
    const ref = doc(firebase.db, ...DOC_PATH);
    const snapshot = await getDoc(ref);
    if (snapshot.exists()) return snapshot.data();
    const seed = await fetchSeed();
    await setDoc(ref, seed);
    return seed;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);
  const seed = await fetchSeed();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

export async function saveState(state) {
  const firebase = await getFirebase();
  if (firebase?.db) {
    const { doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
    await setDoc(doc(firebase.db, ...DOC_PATH), { ...state, updatedAt: serverTimestamp() });
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function watchState(onChange) {
  const firebase = await getFirebase();
  if (firebase?.db) {
    const { doc, onSnapshot } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
    return onSnapshot(doc(firebase.db, ...DOC_PATH), snapshot => {
      if (snapshot.exists()) onChange(snapshot.data());
    });
  }
  onChange(await loadInitialState());
  return () => {};
}

async function fetchSeed() {
  const basePath = window.RAR_CONFIG?.basePath || "/";
  const response = await fetch(`${basePath}data/initial-state.json`);
  if (!response.ok) throw new Error("Initialdaten konnten nicht geladen werden.");
  return response.json();
}

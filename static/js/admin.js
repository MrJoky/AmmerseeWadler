import { getFirebase } from "./firebase.js";
import { loadInitialState, saveState } from "./state.js";

let state;
let signedIn = false;

const teamSelect = document.querySelector("#participant-team");
const riderSelect = document.querySelector("#lap-rider");
const teamEditor = document.querySelector("#admin-teams");
const trackingEditor = document.querySelector("#tracking-editor");
const roster = document.querySelector("#admin-roster");
const authState = document.querySelector("#auth-state");
const loginButton = document.querySelector("#login-button");
const logoutButton = document.querySelector("#logout-button");
const emailInput = document.querySelector("#admin-email");
const passwordInput = document.querySelector("#admin-password");

init();
document.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  button.classList.add("is-pressed");
  window.setTimeout(() => button.classList.remove("is-pressed"), 220);
});

async function init() {
  state = await loadInitialState();
  await initAuth();
  renderAdmin();
}

async function initAuth() {
  const firebase = await getFirebase();
  if (!firebase?.auth) {
    signedIn = false;
    authState.textContent = "Firebase nicht verbunden. Env-Werte pruefen.";
    loginButton.disabled = true;
    return;
  }

  const { signInWithEmailAndPassword, signOut, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
  loginButton.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
      authState.textContent = "E-Mail und Passwort eingeben.";
      return;
    }

    loginButton.disabled = true;
    authState.textContent = "Login laeuft ...";
    try {
      await signInWithEmailAndPassword(firebase.auth, email, password);
    } catch (error) {
      authState.textContent = authErrorMessage(error);
      loginButton.disabled = false;
    }
  });
  logoutButton.addEventListener("click", () => signOut(firebase.auth));
  onAuthStateChanged(firebase.auth, user => {
    signedIn = Boolean(user);
    authState.textContent = user ? `Angemeldet: ${user.email}` : "Nicht angemeldet";
    emailInput.hidden = Boolean(user);
    passwordInput.hidden = Boolean(user);
    if (user) passwordInput.value = "";
    loginButton.hidden = Boolean(user);
    loginButton.disabled = false;
    logoutButton.hidden = !user;
    if (user) seedRaceDocument();
  });
}

document.querySelector("#participant-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (!canEdit()) return;
  const teamId = teamSelect.value;
  const team = state.teams.find(item => item.id === teamId);
  team.riders.push({
    id: crypto.randomUUID(),
    name: document.querySelector("#participant-name").value.trim(),
    startNumber: document.querySelector("#participant-number").value.trim(),
    pinned: document.querySelector("#participant-pinned").checked,
    laps: []
  });
  event.target.reset();
  await persist();
});

document.querySelector("#lap-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (!canEdit()) return;
  const riderId = riderSelect.value;
  const rider = findRider(riderId);
  rider.laps = rider.laps || [];
  rider.laps.push({
    time: document.querySelector("#lap-time").value.trim(),
    note: document.querySelector("#lap-note").value.trim(),
    createdAt: new Date().toISOString()
  });
  event.target.reset();
  await persist();
});

function renderAdmin() {
  teamSelect.replaceChildren(...state.teams.map(team => option(team.id, team.name)));
  riderSelect.replaceChildren(...state.teams.flatMap(team => team.riders.map(rider => option(rider.id, `${team.name}: ${rider.name}`))));
  teamEditor.replaceChildren(...state.teams.map(teamEditorRow));
  renderTrackingEditor();
  roster.replaceChildren(...state.teams.flatMap(team => team.riders.map(rider => rosterRow(team, rider))));
}

function renderTrackingEditor() {
  trackingEditor.replaceChildren(...state.teams.map(team => {
    const row = document.createElement("form");
    const percent = Math.round(normalizeProgress(team.progress || 0) * 1000) / 10;
    row.className = "tracking-row";
    row.style.setProperty("--team-color", team.color);
    row.innerHTML = `
      <strong>${escapeHtml(team.name)}</strong>
      <input name="progress" type="range" min="0" max="1000" value="${Math.round(percent * 10)}">
      <output>${percent.toFixed(1)}%</output>
      <button type="submit">Position speichern</button>
    `;
    const range = row.querySelector("input");
    const output = row.querySelector("output");
    range.addEventListener("input", () => {
      output.textContent = `${(Number(range.value) / 10).toFixed(1)}%`;
    });
    row.addEventListener("submit", async event => {
      event.preventDefault();
      if (!canEdit()) return;
      team.progress = Number(range.value) / 1000;
      await persist();
    });
    return row;
  }));
}

function teamEditorRow(team) {
  const row = document.createElement("form");
  row.className = "team-editor-row";
  row.style.setProperty("--team-color", team.color);
  row.innerHTML = `
    <label>Teamname
      <input name="name" value="${escapeAttribute(team.name)}" required maxlength="80">
    </label>
    <label>Farbe
      <input name="color" type="color" value="${escapeAttribute(team.color || "#d7193f")}">
    </label>
    <button type="submit">Team speichern</button>
  `;
  row.addEventListener("submit", async event => {
    event.preventDefault();
    if (!canEdit()) return;
    const formData = new FormData(row);
    team.name = String(formData.get("name")).trim();
    team.color = String(formData.get("color"));
    await persist();
  });
  return row;
}

function rosterRow(team, rider) {
  const row = document.createElement("form");
  row.className = "roster-row";
  row.innerHTML = `
    <label>Name
      <input name="name" value="${escapeAttribute(rider.name)}" required maxlength="80">
    </label>
    <label>Team
      <select name="team">${state.teams.map(item => `<option value="${escapeAttribute(item.id)}" ${item.id === team.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select>
    </label>
    <label>Startnummer
      <input name="startNumber" value="${escapeAttribute(rider.startNumber || "")}" maxlength="20">
    </label>
    <label class="check-row"><input name="pinned" type="checkbox" ${rider.pinned ? "checked" : ""}> Angepinnt</label>
    <button type="submit">Speichern</button>
  `;
  row.addEventListener("submit", async event => {
    event.preventDefault();
    if (!canEdit()) return;
    const formData = new FormData(row);
    const nextTeamId = String(formData.get("team"));
    rider.name = String(formData.get("name")).trim();
    rider.startNumber = String(formData.get("startNumber")).trim();
    rider.pinned = formData.has("pinned");
    if (nextTeamId !== team.id) moveRider(rider, team.id, nextTeamId);
    await persist();
  });
  return row;
}

async function persist(options = {}) {
  const { rerender = true, message = "Gespeichert." } = options;
  try {
    delete state.demoTracking;
    await saveState(state);
    authState.textContent = message;
    if (rerender) renderAdmin();
  } catch (error) {
    authState.textContent = writeErrorMessage(error);
  }
}

async function seedRaceDocument() {
  try {
    authState.textContent = "Firebase wird initialisiert ...";
    await saveState(state);
    authState.textContent = "Angemeldet und Firebase verbunden.";
  } catch (error) {
    authState.textContent = writeErrorMessage(error);
  }
}

function canEdit() {
  if (signedIn) return true;
  authState.textContent = "Bitte zuerst einloggen.";
  return false;
}

function findRider(id) {
  return state.teams.flatMap(team => team.riders).find(rider => rider.id === id);
}

function moveRider(rider, currentTeamId, nextTeamId) {
  const currentTeam = state.teams.find(team => team.id === currentTeamId);
  const nextTeam = state.teams.find(team => team.id === nextTeamId);
  if (!currentTeam || !nextTeam) return;
  currentTeam.riders = currentTeam.riders.filter(item => item.id !== rider.id);
  nextTeam.riders.push(rider);
}

function normalizeProgress(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return ((numeric % 1) + 1) % 1;
}

function option(value, label) {
  const element = document.createElement("option");
  element.value = value;
  element.textContent = label;
  return element;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function authErrorMessage(error) {
  const code = error?.code || "";
  const messages = {
    "auth/invalid-credential": "Login fehlgeschlagen: E-Mail oder Passwort stimmt nicht.",
    "auth/user-not-found": "Kein Firebase-User mit dieser E-Mail gefunden.",
    "auth/wrong-password": "Passwort stimmt nicht.",
    "auth/invalid-email": "E-Mail-Adresse ist ungueltig.",
    "auth/operation-not-allowed": "E-Mail/Passwort Login ist in Firebase nicht aktiviert.",
    "auth/too-many-requests": "Zu viele Login-Versuche. Kurz warten und erneut probieren."
  };
  return messages[code] || `Login fehlgeschlagen: ${code || error.message}`;
}

function writeErrorMessage(error) {
  if (error?.code === "permission-denied") {
    return "Keine Schreibrechte. Pruefe admins/{deine UID} in Firestore.";
  }
  return `Speichern fehlgeschlagen: ${error?.code || error.message}`;
}

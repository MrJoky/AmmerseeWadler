import { getFirebase } from "./firebase.js";
import { loadInitialState, saveState } from "./state.js";

let state;
let signedIn = false;

const teamSelect = document.querySelector("#participant-team");
const riderSelect = document.querySelector("#lap-rider");
const roster = document.querySelector("#admin-roster");
const authState = document.querySelector("#auth-state");
const loginButton = document.querySelector("#login-button");
const logoutButton = document.querySelector("#logout-button");

init();

async function init() {
  state = await loadInitialState();
  await initAuth();
  renderAdmin();
}

async function initAuth() {
  const firebase = await getFirebase();
  if (!firebase?.auth) {
    signedIn = true;
    authState.textContent = "Lokaler Demo-Modus";
    return;
  }

  const { signInWithEmailAndPassword, signOut, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
  loginButton.addEventListener("click", async () => {
    const email = document.querySelector("#admin-email").value;
    const password = document.querySelector("#admin-password").value;
    await signInWithEmailAndPassword(firebase.auth, email, password);
  });
  logoutButton.addEventListener("click", () => signOut(firebase.auth));
  onAuthStateChanged(firebase.auth, user => {
    signedIn = Boolean(user);
    authState.textContent = user ? `Angemeldet: ${user.email}` : "Nicht angemeldet";
    loginButton.hidden = Boolean(user);
    logoutButton.hidden = !user;
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
  roster.replaceChildren(...state.teams.flatMap(team => team.riders.map(rider => rosterRow(team, rider))));
}

function rosterRow(team, rider) {
  const row = document.createElement("div");
  row.className = "roster-row";
  row.innerHTML = `
    <strong>${escapeHtml(rider.name)}</strong>
    <span>${escapeHtml(team.name)}</span>
    <span>#${escapeHtml(rider.startNumber || "-")}</span>
    <label class="check-row"><input type="checkbox" ${rider.pinned ? "checked" : ""}> Angepinnt</label>
  `;
  row.querySelector("input").addEventListener("change", async event => {
    if (!canEdit()) return;
    rider.pinned = event.target.checked;
    await persist();
  });
  return row;
}

async function persist() {
  await saveState(state);
  renderAdmin();
}

function canEdit() {
  if (signedIn) return true;
  authState.textContent = "Bitte zuerst einloggen.";
  return false;
}

function findRider(id) {
  return state.teams.flatMap(team => team.riders).find(rider => rider.id === id);
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

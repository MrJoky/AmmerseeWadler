import { loadInitialState, watchState } from "./state.js";
import { startRaceClock } from "./timers.js";

let currentState;

startRaceClock(document.querySelector("#remaining-time"));

watchState(async state => {
  currentState = state;
  await refresh();
});

window.setInterval(() => {
  if (currentState) refresh();
}, 30000);

window.setInterval(async () => {
  if (!window.RAR_CONFIG.firebaseEnabled) return;
  currentState = await loadInitialState();
  await refresh();
}, 5000);

async function refresh() {
  document.querySelector("#tracking-status").textContent = window.RAR_CONFIG.firebaseEnabled
    ? "Firebase + RACEMAP"
    : "RACEMAP Player";
  updateRacemapSelection(currentState);
  renderTeams(currentState);
  renderLapTables(currentState);
}

function updateRacemapSelection(state) {
  const frame = document.querySelector("#racemap-frame");
  const note = document.querySelector("#racemap-note");
  const fallback = document.querySelector("#racemap-fallback");
  if (!frame) return;

  const baseSrc = normalizeRacemapBaseUrl(frame.dataset.baseSrc || frame.src);
  const startNumbers = [...new Set(state.teams
    .flatMap(team => team.riders || [])
    .filter(rider => rider.pinned && rider.startNumber)
    .map(rider => rider.startNumber.trim())
    .filter(Boolean))];
  const racemapStartNumbers = startNumbers.flatMap(startNumberAliases);

  if (!startNumbers.length) {
    applyRacemapSrc(frame, baseSrc, "all");
    updateRacemapFallback(fallback, baseSrc);
    if (note) note.textContent = "RACEMAP zeigt alle Starter. Im Admin angepinnte Fahrer werden hier automatisch fokussiert.";
    return;
  }

  const selectedStartNumber = racemapStartNumbers.map(number => encodeURIComponent(number)).join(",");
  const params = [
    `selectedStartNumber=${selectedStartNumber}`,
    "selectedFlagContent=STARTNUMBER_AND_NAME",
    "listOpen=true"
  ];

  if (window.RAR_CONFIG.racemapHideNonSelected) {
    params.push("hideNonSelected=true");
  } else {
    params.push("showAllFlags=false");
  }

  const nextSrc = `${baseSrc}#${params.join("&")}`;
  applyRacemapSrc(frame, nextSrc, selectedStartNumber);
  updateRacemapFallback(fallback, nextSrc);
  if (note) note.textContent = `RACEMAP fokussiert Startnummern: ${racemapStartNumbers.join(", ")} und zeigt weitere Starter als Punkte.`;
}

function startNumberAliases(value) {
  const normalized = String(value).trim();
  const aliases = [normalized];
  if (/^\d{5}$/.test(normalized)) {
    aliases.push(`${normalized.slice(0, 4)}-${normalized.slice(4)}`);
  }
  return [...new Set(aliases)];
}

function normalizeRacemapBaseUrl(src) {
  const url = new URL(src, window.location.href);
  url.hash = "";
  return url.href;
}

function applyRacemapSrc(frame, src, selectionKey) {
  if (frame.dataset.appliedSelection === selectionKey) return;
  frame.dataset.appliedSelection = selectionKey;
  frame.src = src;
}

function updateRacemapFallback(link, src) {
  if (!link) return;
  link.href = src;
}

function renderTeams(state) {
  const target = document.querySelector("#team-cards");
  target.replaceChildren(...state.teams.map(teamCard));
}

function teamCard(team) {
  const laps = team.riders.flatMap(rider => rider.laps || []).length || team.laps || 0;
  const km = laps * window.RAR_CONFIG.lapDistanceKm;
  const activeRiders = team.riders.filter(rider => rider.pinned).map(rider => rider.name).join(", ") || "Noch nicht gesetzt";
  const element = document.createElement("article");
  element.className = "team-card";
  element.style.setProperty("--team-color", team.color);
  element.innerHTML = `
    <h3>${escapeHtml(team.name)}</h3>
    <div class="metrics">
      <div class="metric"><span>Runden</span><strong>${laps}</strong></div>
      <div class="metric"><span>Kilometer</span><strong>${km.toFixed(1)}</strong></div>
      <div class="metric"><span>Aktiv</span><strong>${escapeHtml(activeRiders)}</strong></div>
    </div>
    <ul class="rider-list">
      ${team.riders.map(rider => `<li><span>${escapeHtml(rider.name)}</span><strong>${(rider.laps || []).length}</strong></li>`).join("")}
    </ul>
  `;
  return element;
}

function renderLapTables(state) {
  const target = document.querySelector("#lap-tables");
  target.replaceChildren(...state.teams.map(team => {
    const section = document.createElement("article");
    section.className = "team-card";
    section.style.setProperty("--team-color", team.color);
    section.innerHTML = `
      <h3>${escapeHtml(team.name)}</h3>
      <table>
        <thead><tr><th>Fahrer</th><th>Runde</th><th>Zeit</th></tr></thead>
        <tbody>
          ${team.riders.flatMap(rider => (rider.laps || []).map((lap, index) => `
            <tr><td>${escapeHtml(rider.name)}</td><td>${index + 1}</td><td>${escapeHtml(lap.time)}</td></tr>
          `)).join("") || `<tr><td colspan="3">Noch keine Zeiten</td></tr>`}
        </tbody>
      </table>
    `;
    return section;
  }));
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

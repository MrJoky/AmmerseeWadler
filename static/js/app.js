import { loadInitialState, watchState } from "./state.js";
import { renderMap } from "./map.js";
import { startRaceClock } from "./timers.js";
import { updateFromRacemap } from "./tracking.js";

let currentState;

startRaceClock(document.querySelector("#remaining-time"));

watchState(async state => {
  currentState = state;
  await refresh();
});

window.setInterval(() => {
  if (currentState) refresh();
}, 30000);

window.setInterval(() => {
  if (currentState?.demoTracking?.enabled) refresh();
}, 1000);

window.setInterval(async () => {
  if (!window.RAR_CONFIG.firebaseEnabled) return;
  currentState = await loadInitialState();
  await refresh();
}, 5000);

async function refresh() {
  const animatedState = applyDemoTracking(currentState);
  const result = await updateFromRacemap(animatedState);
  currentState = result.state;
  document.querySelector("#tracking-status").textContent = currentState.demoTracking?.enabled
    ? "Demo-Tracking live"
    : result.source === "Demo-Daten" && window.RAR_CONFIG.firebaseEnabled
    ? "Firebase live"
    : result.source;
  renderMap(currentState);
  renderTeams(currentState);
  renderLapTables(currentState);
}

function applyDemoTracking(sourceState) {
  const demo = sourceState?.demoTracking;
  if (!demo?.enabled || !demo.startedAt) return sourceState;
  const elapsedSeconds = Math.max(0, (Date.now() - new Date(demo.startedAt).getTime()) / 1000);
  return {
    ...sourceState,
    teams: sourceState.teams.map(team => {
      const base = Number(demo.baseProgress?.[team.id] ?? team.progress ?? 0);
      const speed = Number(demo.speeds?.[team.id] ?? 0.0008);
      return { ...team, progress: normalizeProgress(base + elapsedSeconds * speed) };
    })
  };
}

function normalizeProgress(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return ((numeric % 1) + 1) % 1;
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

export function formatDuration(ms) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function startRaceClock(target) {
  const start = new Date(window.RAR_CONFIG.raceStart).getTime();
  const end = start + window.RAR_CONFIG.raceHours * 60 * 60 * 1000;

  function tick() {
    target.textContent = formatDuration(end - Date.now());
  }

  tick();
  return window.setInterval(tick, 1000);
}

export function timeToSeconds(value) {
  const [hours, minutes, seconds] = value.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

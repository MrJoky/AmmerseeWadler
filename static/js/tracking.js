export async function updateFromRacemap(state) {
  const eventId = window.RAR_CONFIG.racemapEventId;
  const proxyUrl = window.RAR_CONFIG.racemapProxyUrl;
  if (!eventId || !proxyUrl) return { state, source: "Demo-Daten" };

  try {
    const response = await fetch(`${proxyUrl}?eventId=${encodeURIComponent(eventId)}`);
    if (!response.ok) throw new Error(`RACEMAP ${response.status}`);
    const data = await response.json();
    const nextState = applyRacemapPositions(state, data);
    return { state: nextState, source: "RACEMAP live" };
  } catch (error) {
    console.warn("RACEMAP Live-Daten nicht verfuegbar.", error);
    return { state, source: "Demo-Daten" };
  }
}

function applyRacemapPositions(state, data) {
  const starters = data?.starters || [];
  const teams = state.teams.map(team => {
    const startNumbers = new Set(team.riders.map(rider => rider.startNumber).filter(Boolean));
    const matching = starters.find(starter => startNumbers.has(starter.startNumber));
    const current = matching?.current;
    if (!current) return team;

    const distance = Number(current.distance || current.distanceOnTrack || 0);
    const lapDistanceMeters = window.RAR_CONFIG.lapDistanceKm * 1000;
    const progress = lapDistanceMeters > 0 ? (distance % lapDistanceMeters) / lapDistanceMeters : team.progress;
    const laps = lapDistanceMeters > 0 ? Math.floor(distance / lapDistanceMeters) : team.laps;
    return { ...team, progress, laps };
  });
  return { ...state, teams };
}

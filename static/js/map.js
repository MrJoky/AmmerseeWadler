export function renderMap(state) {
  const path = document.querySelector("#track-path");
  const markerLayer = document.querySelector("#track-markers");
  if (!path || !markerLayer) return;

  markerLayer.replaceChildren();
  const length = path.getTotalLength();

  state.teams.forEach(team => {
    const progress = normalizeProgress(team.progress || 0);
    const point = path.getPointAtLength(progress * length);
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");

    dot.setAttribute("cx", point.x);
    dot.setAttribute("cy", point.y);
    dot.setAttribute("r", "16");
    dot.setAttribute("fill", team.color);
    dot.setAttribute("class", "team-marker");

    label.setAttribute("x", point.x + 22);
    label.setAttribute("y", point.y + 7);
    label.setAttribute("fill", team.color);
    label.setAttribute("font-size", "22");
    label.setAttribute("font-weight", "900");
    label.textContent = shortName(team.name);

    group.append(dot, label);
    markerLayer.append(group);
  });
}

function normalizeProgress(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return ((numeric % 1) + 1) % 1;
}

function shortName(name) {
  return name.replace(/^Team\s+/i, "").slice(0, 16);
}

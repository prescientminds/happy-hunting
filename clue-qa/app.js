/* ── Config ─────────────────────────────────────── */

const BARS = {
  'gold-room':  { name: 'Gold Room',    pool: 'gold-room-v3.json', profile: 'gold-room.json' },
  'thunderbolt':{ name: 'Thunderbolt',  pool: 'thunderbolt-v3.json',  profile: 'thunderbolt.json' },
  'seven-grand':{ name: 'Seven Grand',  pool: 'seven-grand-v3.json',  profile: 'seven-grand.json' },
  'frolic-room':{ name: 'Frolic Room',  pool: 'frolic-room-v3.json',  profile: 'frolic-room.json' },
  'la-cuevita': { name: 'La Cuevita',   pool: 'la-cuevita-v3.json',   profile: 'la-cuevita.json' },
  'escala':     { name: 'Escala',        pool: 'escala-v3.json',       profile: 'escala.json' }
};

const TYPE_COLORS = {
  spotter:     '#3b82f6',
  connector:   '#8b5cf6',
  narrative:   '#10b981',
  elimination: '#ef4444',
  reframe:     '#f59e0b',
  cipher:      '#6366f1',
  photo:       '#ec4899',
  sequence:    '#14b8a6'
};

const RING_COLORS = { 1: '#3b82f6', 2: '#10b981', 3: '#f59e0b' };

/* ── State ──────────────────────────────────────── */

let currentBarId = 'gold-room';
let pool = [];
let profile = null;
let qa = {};
let map = null;
let mapLayers = [];
let focusedIndex = null;

/* ── Init ───────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', init);

async function init() {
  populateBarSelect();
  initMap();
  bindEvents();
  await loadBar(currentBarId);
}

function bindEvents() {
  document.getElementById('bar-select').addEventListener('change', e => loadBar(e.target.value));
  document.getElementById('filter-ring').addEventListener('change', renderClueList);
  document.getElementById('filter-type').addEventListener('change', renderClueList);
  document.getElementById('filter-status').addEventListener('change', renderClueList);
  document.getElementById('export-pool').addEventListener('click', exportPool);
  document.getElementById('export-qa').addEventListener('click', exportQA);

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (focusedIndex === null) return;
    if (e.key === 'f') { e.preventDefault(); toggleFavorite(focusedIndex); }
    if (e.key === 'x') { e.preventDefault(); toggleFlag(focusedIndex); }
    if (e.key === 'e') { e.preventDefault(); startEdit(focusedIndex); }
    if (e.key === 'd') { e.preventDefault(); toggleDelete(focusedIndex); }
    if (e.key === 'j') { e.preventDefault(); navigateCards(1); }
    if (e.key === 'k') { e.preventDefault(); navigateCards(-1); }
  });
}

/* ── Data ───────────────────────────────────────── */

function populateBarSelect() {
  const sel = document.getElementById('bar-select');
  Object.entries(BARS).forEach(([id, cfg]) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = cfg.name;
    sel.appendChild(opt);
  });
}

async function loadBar(barId) {
  currentBarId = barId;
  document.getElementById('bar-select').value = barId;
  const cfg = BARS[barId];

  try {
    const [poolRes, profileRes] = await Promise.all([
      fetch(`../clue-engine/raw-pools/${cfg.pool}`),
      fetch(`../clue-engine/place-profiles/${cfg.profile}`)
    ]);
    pool = await poolRes.json();
    profile = await profileRes.json();
  } catch (err) {
    console.error('Failed to load bar data:', err);
    pool = [];
    profile = null;
  }

  qa = loadQA(barId);
  focusedIndex = null;
  populateTypeFilter();
  renderAll();
}

function loadQA(barId) {
  const stored = localStorage.getItem(`clue-qa-${barId}`);
  return stored ? JSON.parse(stored) : {};
}

function saveQA() {
  localStorage.setItem(`clue-qa-${currentBarId}`, JSON.stringify(qa));
}

function getQA(index) {
  if (!qa[index]) {
    qa[index] = { favorite: false, flagged: false, deleted: false, notes: '', edits: {} };
  }
  return qa[index];
}

function isReviewed(index) {
  const q = qa[index];
  if (!q) return false;
  return q.favorite || q.flagged || q.deleted || (q.notes && q.notes.trim()) || Object.keys(q.edits || {}).length > 0;
}

/* ── Render ─────────────────────────────────────── */

function renderAll() {
  renderMap();
  renderRouteInfo();
  renderClueList();
  updateStats();
}

function populateTypeFilter() {
  const sel = document.getElementById('filter-type');
  const current = sel.value;
  const types = [...new Set(pool.map(c => c.type))].sort();
  sel.innerHTML = '<option value="all">All Types</option>';
  types.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    sel.appendChild(opt);
  });
  if (types.includes(current)) sel.value = current;
}

/* ── Map ────────────────────────────────────────── */

function initMap() {
  map = L.map('map', { zoomControl: true }).setView([34.0765, -118.2571], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://openstreetmap.org">OSM</a>'
  }).addTo(map);
}

function renderMap() {
  mapLayers.forEach(l => map.removeLayer(l));
  mapLayers = [];
  if (!profile) return;

  const bar = profile.bar;
  const stops = profile.route.stops;
  const points = [];

  // Stop markers
  stops.forEach(stop => {
    const color = RING_COLORS[stop.ring] || '#666';
    const marker = L.marker([stop.lat, stop.lng], {
      icon: L.divIcon({
        className: '',
        html: `<div class="marker-stop" data-ring="${stop.ring}" style="background:${color}">${stop.stopNumber}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })
    }).addTo(map);
    marker.bindPopup(`<b>Ring ${stop.ring}</b><br>${stop.label}`);
    marker.on('click', () => scrollToRing(stop.ring));
    mapLayers.push(marker);
    points.push([stop.lat, stop.lng]);
  });

  // Bar marker
  const barMarker = L.marker([bar.lat, bar.lng], {
    icon: L.divIcon({
      className: '',
      html: '<div class="marker-bar">&#127866;</div>',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    })
  }).addTo(map);
  barMarker.bindPopup(`<b>${bar.name}</b><br>${bar.address}`);
  mapLayers.push(barMarker);
  points.push([bar.lat, bar.lng]);

  // Route polyline
  const line = L.polyline(points, {
    color: '#555', weight: 2, dashArray: '6,6', opacity: 0.5
  }).addTo(map);
  mapLayers.push(line);

  // Supplemental POI dots
  const stopIds = new Set(stops.map(s => s.poiId));
  profile.pois.forEach(poi => {
    if (stopIds.has(poi.poiId)) return;
    const dot = L.circleMarker([poi.lat, poi.lng], {
      radius: 4, fillColor: '#9ca3af', fillOpacity: 0.5,
      stroke: true, color: '#fff', weight: 1
    }).addTo(map);
    dot.bindPopup(`<small>${poi.name}</small>`);
    mapLayers.push(dot);
  });

  // Fit bounds
  if (points.length > 1) {
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }
}

function highlightRingOnMap(ring) {
  document.querySelectorAll('.marker-stop').forEach(el => {
    if (parseInt(el.dataset.ring) === ring) {
      el.classList.add('highlight');
    } else {
      el.classList.remove('highlight');
    }
  });
}

/* ── Route Info ─────────────────────────────────── */

function renderRouteInfo() {
  const el = document.getElementById('route-info');
  if (!profile) { el.innerHTML = ''; return; }

  const bar = profile.bar;
  const route = profile.route;
  const stops = route.stops;

  el.innerHTML = `
    <div class="route-title">${bar.name}</div>
    <div class="route-meta">${bar.address} &mdash; ${route.totalDistance}, ~${route.estimatedWalkTime}</div>
    <ul class="route-stops">
      ${stops.map(s => `
        <li onclick="scrollToRing(${s.ring})">
          <span class="stop-dot" style="background:${RING_COLORS[s.ring]}"></span>
          <span>Ring ${s.ring}: ${s.label}</span>
        </li>
      `).join('')}
      <li>
        <span class="stop-dot" style="background:#ef4444"></span>
        <span>${bar.name}</span>
      </li>
    </ul>
  `;
}

/* ── Clue List ──────────────────────────────────── */

function renderClueList() {
  const container = document.getElementById('clue-list');
  container.innerHTML = '';

  if (pool.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No clues loaded.</p></div>';
    updateStats();
    return;
  }

  const ringFilter = document.getElementById('filter-ring').value;
  const typeFilter = document.getElementById('filter-type').value;
  const statusFilter = document.getElementById('filter-status').value;

  // Group by ring
  const rings = {};
  pool.forEach((clue, i) => {
    const r = clue.ring;
    if (!rings[r]) rings[r] = [];
    rings[r].push({ clue, index: i });
  });

  let visibleCount = 0;

  Object.keys(rings).sort((a, b) => a - b).forEach(ring => {
    if (ringFilter !== 'all' && ring !== ringFilter) return;

    const items = rings[ring];
    const stop = profile?.route?.stops?.find(s => s.ring === parseInt(ring));
    const label = stop ? stop.label : `Ring ${ring}`;
    const reviewed = items.filter(({ index }) => isReviewed(index)).length;

    const section = document.createElement('div');
    section.className = 'ring-section';
    section.id = `ring-${ring}`;

    const header = document.createElement('div');
    header.className = 'ring-header';
    header.innerHTML = `
      <span class="ring-badge" style="background:${RING_COLORS[parseInt(ring)] || '#666'}">${ring}</span>
      <span class="ring-label">${label}</span>
      <span class="ring-progress">${reviewed}/${items.length} reviewed</span>
    `;
    section.appendChild(header);

    let sectionHasCards = false;
    items.forEach(({ clue, index }) => {
      if (typeFilter !== 'all' && clue.type !== typeFilter) return;
      const q = getQA(index);
      if (statusFilter === 'favorite' && !q.favorite) return;
      if (statusFilter === 'flagged' && !q.flagged) return;
      if (statusFilter === 'deleted' && !q.deleted) return;
      if (statusFilter === 'edited' && Object.keys(q.edits || {}).length === 0) return;
      if (statusFilter === 'unreviewed' && isReviewed(index)) return;

      section.appendChild(createClueCard(clue, index));
      sectionHasCards = true;
      visibleCount++;
    });

    if (sectionHasCards || statusFilter === 'all') {
      container.appendChild(section);
    }
  });

  if (visibleCount === 0 && statusFilter !== 'all') {
    container.innerHTML = `<div class="empty-state"><p>No clues match the current filters.</p></div>`;
  }

  updateStats();
}

function createClueCard(clue, index) {
  const q = getQA(index);
  const card = document.createElement('div');
  card.className = 'clue-card';
  card.dataset.index = index;
  if (q.favorite) card.classList.add('favorite');
  if (q.flagged) card.classList.add('flagged');
  if (q.deleted) card.classList.add('deleted');
  if (focusedIndex === index) card.classList.add('focused');

  const typeColor = TYPE_COLORS[clue.type] || '#666';
  const isPhoto = clue.type === 'photo' || clue.answerType === 'photo';
  const displayClue = q.edits?.clue ?? clue.clue;
  const displayAnswer = q.edits?.answer ?? clue.answer;
  const displayFact = q.edits?.historicalFact ?? clue.historicalFact;
  const hasEdits = q.edits && Object.keys(q.edits).length > 0;

  card.innerHTML = `
    <div class="card-header">
      <div class="card-meta">
        <span class="difficulty-badge">D${clue.difficulty}</span>
        <span class="type-badge" style="background:${typeColor}">${clue.type}</span>
        ${isPhoto ? '<span class="photo-badge">&#128247;</span>' : ''}
        ${hasEdits ? '<span class="edited-badge">edited</span>' : ''}
      </div>
      <div class="card-actions">
        <button class="action-btn fav-btn ${q.favorite ? 'active' : ''}" data-action="fav" title="Favorite (f)">&#9733;</button>
        <button class="action-btn flag-btn ${q.flagged ? 'active' : ''}" data-action="flag" title="Flag (x)">&#9873;</button>
        <button class="action-btn edit-btn" data-action="edit" title="Edit (e)">&#9998;</button>
        <button class="action-btn del-btn ${q.deleted ? 'active' : ''}" data-action="del" title="${q.deleted ? 'Restore' : 'Delete'} (d)">${q.deleted ? '&#8617;' : '&#10005;'}</button>
      </div>
    </div>
    <div class="card-clue" data-field="clue">${esc(displayClue)}</div>
    <div class="card-answer">
      <span class="answer-label">Answer:</span>
      <span class="answer-text" data-field="answer">${isPhoto ? '(photo)' : esc(displayAnswer)}</span>
      ${clue.answerVariants?.length > 0 ? `<span class="variants">${clue.answerVariants.map(esc).join(', ')}</span>` : ''}
    </div>
    <details class="card-fact">
      <summary>Historical fact</summary>
      <p data-field="fact">${esc(displayFact)}</p>
    </details>
    <div class="card-notes">
      <textarea placeholder="QA notes..." rows="2" data-field="notes">${esc(q.notes || '')}</textarea>
    </div>
  `;

  // Event delegation
  card.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (btn) {
      e.stopPropagation();
      const action = btn.dataset.action;
      if (action === 'fav') toggleFavorite(index);
      else if (action === 'flag') toggleFlag(index);
      else if (action === 'edit') startEdit(index);
      else if (action === 'del') toggleDelete(index);
      return;
    }
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    focusClue(index);
  });

  // Notes auto-save
  const notesEl = card.querySelector('[data-field="notes"]');
  let noteTimer;
  notesEl.addEventListener('input', () => {
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
      const q = getQA(index);
      q.notes = notesEl.value;
      saveQA();
      updateStats();
    }, 400);
  });

  return card;
}

/* ── Card Actions ───────────────────────────────── */

function toggleFavorite(index) {
  const q = getQA(index);
  q.favorite = !q.favorite;
  saveQA();
  refreshCard(index);
  updateStats();
}

function toggleFlag(index) {
  const q = getQA(index);
  q.flagged = !q.flagged;
  saveQA();
  refreshCard(index);
  updateStats();
}

function toggleDelete(index) {
  const q = getQA(index);
  q.deleted = !q.deleted;
  saveQA();
  refreshCard(index);
  updateStats();
}

function startEdit(index) {
  const card = document.querySelector(`.clue-card[data-index="${index}"]`);
  if (!card || card.classList.contains('editing')) return;

  const clue = pool[index];
  const q = getQA(index);
  const currentClue = q.edits?.clue ?? clue.clue;
  const currentAnswer = q.edits?.answer ?? clue.answer;
  const currentFact = q.edits?.historicalFact ?? clue.historicalFact;

  card.classList.add('editing');

  // Replace display text with edit fields
  const clueEl = card.querySelector('[data-field="clue"]');
  clueEl.innerHTML = `<textarea class="edit-textarea" data-edit="clue" rows="4">${esc(currentClue)}</textarea>`;

  const answerEl = card.querySelector('[data-field="answer"]');
  answerEl.innerHTML = `<input class="edit-input" data-edit="answer" type="text" value="${esc(currentAnswer)}">`;

  const factEl = card.querySelector('[data-field="fact"]');
  const factDetails = card.querySelector('.card-fact');
  factDetails.open = true;
  factEl.innerHTML = `<textarea class="edit-textarea" data-edit="fact" rows="3">${esc(currentFact)}</textarea>`;

  // Replace action buttons with save/cancel
  const actions = card.querySelector('.card-actions');
  actions.innerHTML = `
    <button class="action-btn save-btn" data-action="save">Save</button>
    <button class="action-btn cancel-btn" data-action="cancel">Cancel</button>
  `;

  // Rebind for save/cancel
  actions.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    e.stopPropagation();
    if (btn.dataset.action === 'save') saveEdit(index);
    else if (btn.dataset.action === 'cancel') cancelEdit(index);
  });

  // Focus the clue textarea
  card.querySelector('[data-edit="clue"]').focus();
}

function saveEdit(index) {
  const card = document.querySelector(`.clue-card[data-index="${index}"]`);
  if (!card) return;

  const clue = pool[index];
  const q = getQA(index);

  const newClue = card.querySelector('[data-edit="clue"]')?.value ?? '';
  const newAnswer = card.querySelector('[data-edit="answer"]')?.value ?? '';
  const newFact = card.querySelector('[data-edit="fact"]')?.value ?? '';

  q.edits = {};
  if (newClue.trim() !== clue.clue.trim()) q.edits.clue = newClue;
  if (newAnswer.trim() !== clue.answer.trim()) q.edits.answer = newAnswer;
  if (newFact.trim() !== clue.historicalFact.trim()) q.edits.historicalFact = newFact;

  saveQA();
  refreshCard(index);
  updateStats();
}

function cancelEdit(index) {
  refreshCard(index);
}

function refreshCard(index) {
  const old = document.querySelector(`.clue-card[data-index="${index}"]`);
  if (!old) return;
  const scrollPos = document.getElementById('list-panel').scrollTop;
  const newCard = createClueCard(pool[index], index);
  old.replaceWith(newCard);
  document.getElementById('list-panel').scrollTop = scrollPos;
}

/* ── Focus & Navigation ─────────────────────────── */

function focusClue(index) {
  // Remove old focus
  document.querySelectorAll('.clue-card.focused').forEach(c => c.classList.remove('focused'));
  focusedIndex = index;

  const card = document.querySelector(`.clue-card[data-index="${index}"]`);
  if (card) card.classList.add('focused');

  // Highlight ring on map
  const ring = pool[index]?.ring;
  if (ring) {
    highlightRingOnMap(ring);
    panToRing(ring);
  }
}

function navigateCards(dir) {
  const cards = [...document.querySelectorAll('.clue-card')];
  if (cards.length === 0) return;

  if (focusedIndex === null) {
    focusClue(parseInt(cards[0].dataset.index));
    return;
  }

  const currentIdx = cards.findIndex(c => parseInt(c.dataset.index) === focusedIndex);
  const nextIdx = Math.max(0, Math.min(cards.length - 1, currentIdx + dir));
  const nextCard = cards[nextIdx];
  const newIndex = parseInt(nextCard.dataset.index);
  focusClue(newIndex);

  // Scroll card into view
  nextCard.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function scrollToRing(ring) {
  const section = document.getElementById(`ring-${ring}`);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  highlightRingOnMap(ring);
}

function panToRing(ring) {
  if (!profile) return;
  const stop = profile.route.stops.find(s => s.ring === ring);
  if (stop) {
    map.panTo([stop.lat, stop.lng], { animate: true, duration: 0.3 });
  }
}

/* ── Stats ──────────────────────────────────────── */

function updateStats() {
  const total = pool.length;
  const reviewed = pool.filter((_, i) => isReviewed(i)).length;
  const favs = Object.values(qa).filter(q => q.favorite).length;
  const flags = Object.values(qa).filter(q => q.flagged).length;
  const deleted = Object.values(qa).filter(q => q.deleted).length;
  const edited = Object.values(qa).filter(q => Object.keys(q.edits || {}).length > 0).length;

  document.getElementById('stats').innerHTML = `
    <span class="stat"><strong>${reviewed}</strong>/${total} reviewed</span>
    <span class="stat"><strong style="color:#f59e0b">${favs}</strong> fav</span>
    <span class="stat"><strong style="color:#ef4444">${flags}</strong> flag</span>
    <span class="stat"><strong style="color:#6366f1">${edited}</strong> edit</span>
    <span class="stat"><strong>${deleted}</strong> del</span>
  `;
}

/* ── Export ──────────────────────────────────────── */

function exportPool() {
  const cleaned = pool
    .map((clue, i) => {
      const q = qa[i] || {};
      if (q.deleted) return null;
      const out = { ...clue };
      if (q.edits?.clue) out.clue = q.edits.clue;
      if (q.edits?.answer) out.answer = q.edits.answer;
      if (q.edits?.historicalFact) out.historicalFact = q.edits.historicalFact;
      return out;
    })
    .filter(Boolean);

  downloadJSON(cleaned, `${currentBarId}-reviewed.json`);
}

function exportQA() {
  const report = {
    barId: currentBarId,
    barName: BARS[currentBarId].name,
    exportDate: new Date().toISOString(),
    summary: {
      total: pool.length,
      reviewed: pool.filter((_, i) => isReviewed(i)).length,
      favorited: Object.values(qa).filter(q => q.favorite).length,
      flagged: Object.values(qa).filter(q => q.flagged).length,
      deleted: Object.values(qa).filter(q => q.deleted).length,
      edited: Object.values(qa).filter(q => Object.keys(q.edits || {}).length > 0).length
    },
    clues: pool.map((clue, i) => ({
      index: i,
      ring: clue.ring,
      difficulty: clue.difficulty,
      type: clue.type,
      clue: clue.clue,
      answer: clue.answer,
      qa: qa[i] || { favorite: false, flagged: false, deleted: false, notes: '', edits: {} }
    }))
  };

  downloadJSON(report, `${currentBarId}-qa-report.json`);
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── Util ───────────────────────────────────────── */

function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Neighborhood color palette
const NEIGHBORHOOD_COLORS = {
  'Santa Monica':         { bg: '#2563eb', text: '#fff' },
  'Venice':               { bg: '#0891b2', text: '#fff' },
  'West Hollywood':       { bg: '#9333ea', text: '#fff' },
  'Hollywood':            { bg: '#c026d3', text: '#fff' },
  'DTLA':                 { bg: '#dc2626', text: '#fff' },
  'DTLA / Fashion District': { bg: '#dc2626', text: '#fff' },
  'DTLA / Historic Core': { bg: '#dc2626', text: '#fff' },
  'Arts District':        { bg: '#e11d48', text: '#fff' },
  'Koreatown':            { bg: '#ea580c', text: '#fff' },
  'Silver Lake':          { bg: '#16a34a', text: '#fff' },
  'Los Feliz':            { bg: '#15803d', text: '#fff' },
  'Highland Park':        { bg: '#65a30d', text: '#fff' },
  'Echo Park':            { bg: '#4d7c0f', text: '#fff' },
  'Atwater Village':      { bg: '#059669', text: '#fff' },
  'Culver City':          { bg: '#0d9488', text: '#fff' },
  'Pasadena':             { bg: '#7c3aed', text: '#fff' },
  'Pasadena / South Pasadena': { bg: '#7c3aed', text: '#fff' },
  'Beverly Hills':        { bg: '#d97706', text: '#fff' },
  'Pico-Robertson':       { bg: '#b45309', text: '#fff' },
  'West 3rd / Fairfax':   { bg: '#be185d', text: '#fff' },
  'Fairfax':              { bg: '#be185d', text: '#fff' },
  'Melrose':              { bg: '#a21caf', text: '#fff' },
  'North Hollywood':      { bg: '#6366f1', text: '#fff' },
  'Little Tokyo':         { bg: '#f43f5e', text: '#fff' },
  'Marina del Rey':       { bg: '#0e7490', text: '#fff' },
  'Glendale':             { bg: '#8b5cf6', text: '#fff' },
  'Lincoln Heights':      { bg: '#84cc16', text: '#1a1d27' },
  'Manhattan Beach':      { bg: '#06b6d4', text: '#fff' },
  'Hermosa Beach':        { bg: '#22d3ee', text: '#1a1d27' },
  'Redondo Beach':        { bg: '#67e8f9', text: '#1a1d27' },
  'El Segundo':           { bg: '#0284c7', text: '#fff' },
  'Near LAX':             { bg: '#475569', text: '#fff' },
  'WeHo / Los Feliz / SM / Westwood': { bg: '#a855f7', text: '#fff' },
  'Palms':                { bg: '#14b8a6', text: '#fff' },
  'Miracle Mile':         { bg: '#f59e0b', text: '#1a1d27' },
  'Glassell Park':        { bg: '#2dd4bf', text: '#1a1d27' },
  'Eagle Rock':           { bg: '#a3e635', text: '#1a1d27' },
  'Sawtelle':             { bg: '#38bdf8', text: '#1a1d27' },
  'Westwood':             { bg: '#818cf8', text: '#fff' },
  'Brentwood':            { bg: '#fb923c', text: '#1a1d27' },
  'Mar Vista':            { bg: '#34d399', text: '#1a1d27' },
  'West Adams':           { bg: '#f472b6', text: '#1a1d27' },
  'Thai Town':            { bg: '#c084fc', text: '#fff' },
  'Historic Filipinotown': { bg: '#f97316', text: '#fff' },
};

const DEFAULT_COLOR = { bg: '#6b7280', text: '#fff' };
function getColor(n) { return NEIGHBORHOOD_COLORS[n] || DEFAULT_COLOR; }
function qualityRank(q) { return { 'A+': 4, 'A': 3, 'B+': 2, 'B': 1 }[q] || 0; }

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return m === 0 ? `${hour}${suffix}` : `${hour}:${m.toString().padStart(2, '0')}${suffix}`;
}

function shortTimeRange(start, end) {
  return `${formatTime(start)}\u2013${end === '24:00' ? '12am' : formatTime(end)}`;
}

function buildTooltip(deal) {
  const qc = deal.quality === 'A+' ? 'a-plus' : deal.quality === 'A' ? 'a' : deal.quality === 'B+' ? 'b-plus' : 'b';
  let h = `<div class="tooltip-inner">`;
  h += `<div class="tooltip-header"><span class="tooltip-name">${deal.restaurant}</span><span class="tooltip-quality ${qc}">${deal.quality}</span></div>`;
  h += `<div class="tooltip-meta"><span>${deal.neighborhood}</span>`;
  if (deal.address && deal.address !== deal.neighborhood) h += `<span>${deal.address}</span>`;
  h += `<span>${shortTimeRange(deal.startTime, deal.endTime)}</span></div>`;
  if (deal.drinks?.length) {
    h += `<div class="tooltip-section"><div class="tooltip-section-title">Drinks</div><ul>${deal.drinks.map(d => `<li>${d}</li>`).join('')}</ul></div>`;
  }
  if (deal.food?.length) {
    h += `<div class="tooltip-section"><div class="tooltip-section-title">Food</div><ul>${deal.food.map(f => `<li>${f}</li>`).join('')}</ul></div>`;
  }
  if (deal.normalPriceContext) {
    h += `<div class="tooltip-value">${deal.normalPriceContext}</div>`;
  }
  h += `</div>`;
  return h;
}

// ---- Multi-select dropdown component ----
class MultiSelect {
  constructor(el, options, { colorFn, countFn, labelFn, onChange }) {
    this.el = el;
    this.options = options;
    this.selected = new Set(options);
    this.colorFn = colorFn;
    this.countFn = countFn;
    this.labelFn = labelFn || (v => v);
    this.onChange = onChange;
    this.render();
    this.bind();
  }

  render() {
    const container = this.el.querySelector('.ms-options');
    container.innerHTML = '';
    this.options.forEach(opt => {
      const count = this.countFn ? this.countFn(opt) : '';
      const color = this.colorFn ? this.colorFn(opt) : null;
      const div = document.createElement('div');
      div.className = 'ms-option';
      div.dataset.value = opt;
      div.innerHTML = `
        <input type="checkbox" checked>
        ${color ? `<span class="ms-swatch" style="background:${color.bg}"></span>` : ''}
        <span class="ms-label">${this.labelFn(opt)}</span>
        ${count ? `<span class="ms-count">${count}</span>` : ''}
      `;
      container.appendChild(div);
    });
    this.updateTrigger();
  }

  bind() {
    const trigger = this.el.querySelector('.ms-trigger');
    const dropdown = this.el.querySelector('.ms-dropdown');
    const search = this.el.querySelector('.ms-search');

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.multi-select.open').forEach(ms => {
        if (ms !== this.el) ms.classList.remove('open');
      });
      this.el.classList.toggle('open');
      if (this.el.classList.contains('open') && search) {
        search.value = '';
        this.filterOptions('');
        setTimeout(() => search.focus(), 50);
      }
    });

    dropdown.addEventListener('click', e => e.stopPropagation());
    if (search) search.addEventListener('input', () => this.filterOptions(search.value));

    this.el.querySelector('.ms-options').addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') {
        const val = e.target.closest('.ms-option').dataset.value;
        if (e.target.checked) this.selected.add(val);
        else this.selected.delete(val);
        this.updateTrigger();
        this.onChange(this.selected);
      }
    });

    this.el.querySelectorAll('.ms-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const allSelected = this.selected.size === this.options.length;
        this.selected = allSelected ? new Set() : new Set(this.options);
        this.el.querySelectorAll('.ms-option input').forEach(cb => {
          cb.checked = !allSelected;
        });
        this.updateTrigger();
        this.onChange(this.selected);
      });
    });

    document.addEventListener('click', () => this.el.classList.remove('open'));
  }

  filterOptions(query) {
    const q = query.toLowerCase();
    this.el.querySelectorAll('.ms-option').forEach(opt => {
      opt.classList.toggle('hidden', !opt.dataset.value.toLowerCase().includes(q));
    });
  }

  updateTrigger() {
    const trigger = this.el.querySelector('.ms-trigger');
    const total = this.options.length;
    const count = this.selected.size;
    const placeholder = trigger.dataset.placeholder;
    if (count === total) {
      trigger.textContent = `All ${placeholder}`;
      trigger.classList.remove('has-selection');
    } else if (count === 0) {
      trigger.textContent = `No ${placeholder}`;
      trigger.classList.add('has-selection');
    } else {
      trigger.textContent = `${count} ${placeholder}`;
      trigger.classList.add('has-selection');
    }
  }

  deselect(val) {
    this.selected.delete(val);
    const opt = this.el.querySelector(`.ms-option[data-value="${CSS.escape(val)}"]`);
    if (opt) opt.querySelector('input').checked = false;
    this.updateTrigger();
    this.onChange(this.selected);
  }

  isAllSelected() { return this.selected.size === this.options.length; }
}

// ---- Time slot definitions ----
const TIME_SLOTS = [
  { id: 'lunch',   label: 'Lunch & All Day', minHour: 0,  maxHour: 14, accent: '#6a9fba' },
  { id: 'hh',      label: 'Happy Hour',      minHour: 14, maxHour: 19, accent: '#c9956b' },
  { id: 'evening', label: 'Evening & Late',   minHour: 19, maxHour: 30, accent: '#a07dba' },
];

function getSlot(startTime) {
  const hour = parseInt(startTime.split(':')[0]);
  for (const slot of TIME_SLOTS) {
    if (hour >= slot.minHour && hour < slot.maxHour) return slot;
  }
  return TIME_SLOTS[0];
}

// ---- Main app ----
async function init() {
  const response = await fetch('deals.json');
  const deals = await response.json();

  const restaurantNames = [...new Set(deals.map(d => d.restaurant))].sort();
  const neighborhoods = [...new Set(deals.map(d => d.neighborhood))].sort();

  const hoodCounts = {};
  neighborhoods.forEach(n => { hoodCounts[n] = deals.filter(d => d.neighborhood === n).length; });
  const restCounts = {};
  restaurantNames.forEach(r => { restCounts[r] = deals.filter(d => d.restaurant === r).length; });

  // Venue count
  document.getElementById('venue-count').textContent = `${restaurantNames.length} venues across ${neighborhoods.length} neighborhoods`;

  // Quality and tag options
  const qualityTiers = ['A+', 'A', 'B+', 'B'];
  const qualityCounts = {};
  qualityTiers.forEach(q => { qualityCounts[q] = deals.filter(d => d.quality === q).length; });

  const allTags = [...new Set(deals.flatMap(d => d.tags || []))].sort();
  const tagCounts = {};
  allTags.forEach(t => { tagCounts[t] = deals.filter(d => (d.tags || []).includes(t)).length; });

  // State
  let selectedNeighborhoods = new Set(neighborhoods);
  let selectedRestaurants = new Set(restaurantNames);
  let selectedQualities = new Set(qualityTiers);
  let selectedTags = new Set(allTags);
  let showLateNight = false;

  // Init multi-selects
  const neighborhoodMs = new MultiSelect(
    document.getElementById('neighborhood-ms'),
    neighborhoods,
    {
      colorFn: getColor,
      countFn: n => hoodCounts[n],
      onChange: (sel) => {
        selectedNeighborhoods = sel;
        updateRestaurantOptions();
        renderPills();
        refresh();
      }
    }
  );

  const restaurantMs = new MultiSelect(
    document.getElementById('restaurant-ms'),
    restaurantNames,
    {
      colorFn: r => {
        const deal = deals.find(d => d.restaurant === r);
        return deal ? getColor(deal.neighborhood) : DEFAULT_COLOR;
      },
      countFn: r => restCounts[r] > 1 ? restCounts[r] : '',
      onChange: (sel) => {
        selectedRestaurants = sel;
        renderPills();
        refresh();
      }
    }
  );

  const qualityMs = new MultiSelect(
    document.getElementById('quality-ms'),
    qualityTiers,
    {
      countFn: q => qualityCounts[q],
      onChange: (sel) => {
        selectedQualities = sel;
        refresh();
      }
    }
  );

  const tagMs = new MultiSelect(
    document.getElementById('tag-ms'),
    allTags,
    {
      countFn: t => tagCounts[t],
      labelFn: t => t.replace(/-/g, ' '),
      onChange: (sel) => {
        selectedTags = sel;
        refresh();
      }
    }
  );

  function updateRestaurantOptions() {
    const visibleRestaurants = [...new Set(
      deals.filter(d => selectedNeighborhoods.has(d.neighborhood)).map(d => d.restaurant)
    )].sort();
    const newSelected = new Set([...selectedRestaurants].filter(r => visibleRestaurants.includes(r)));
    if (restaurantMs.isAllSelected() || selectedRestaurants.size === restaurantNames.length) {
      visibleRestaurants.forEach(r => newSelected.add(r));
    }
    selectedRestaurants = newSelected;
    const restContainer = document.getElementById('restaurant-ms').querySelector('.ms-options');
    restContainer.innerHTML = '';
    visibleRestaurants.forEach(r => {
      const deal = deals.find(d => d.restaurant === r);
      const color = deal ? getColor(deal.neighborhood) : DEFAULT_COLOR;
      const count = restCounts[r] > 1 ? restCounts[r] : '';
      const div = document.createElement('div');
      div.className = 'ms-option';
      div.dataset.value = r;
      div.innerHTML = `
        <input type="checkbox" ${newSelected.has(r) ? 'checked' : ''}>
        <span class="ms-swatch" style="background:${color.bg}"></span>
        <span class="ms-label">${r}</span>
        ${count ? `<span class="ms-count">${count}</span>` : ''}
      `;
      restContainer.appendChild(div);
    });
    restaurantMs.options = visibleRestaurants;
    restaurantMs.selected = newSelected;
    restaurantMs.updateTrigger();
  }

  // Pills
  function renderPills() {
    const container = document.getElementById('active-pills');
    container.innerHTML = '';
    if (!neighborhoodMs.isAllSelected()) {
      [...selectedNeighborhoods].sort().forEach(n => {
        const color = getColor(n);
        const pill = document.createElement('span');
        pill.className = 'pill pill-neighborhood';
        pill.innerHTML = `<span class="pill-swatch" style="background:${color.bg}"></span>${n}<span class="pill-remove" data-type="neighborhood" data-value="${n}">&times;</span>`;
        container.appendChild(pill);
      });
    }
    if (!restaurantMs.isAllSelected() && selectedRestaurants.size <= 10) {
      [...selectedRestaurants].sort().forEach(r => {
        const pill = document.createElement('span');
        pill.className = 'pill pill-restaurant';
        pill.innerHTML = `${r}<span class="pill-remove" data-type="restaurant" data-value="${r}">&times;</span>`;
        container.appendChild(pill);
      });
    } else if (!restaurantMs.isAllSelected() && selectedRestaurants.size > 10) {
      const pill = document.createElement('span');
      pill.className = 'pill pill-restaurant';
      pill.textContent = `${selectedRestaurants.size} restaurants selected`;
      container.appendChild(pill);
    }
    container.querySelectorAll('.pill-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.type === 'neighborhood') neighborhoodMs.deselect(btn.dataset.value);
        else if (btn.dataset.type === 'restaurant') restaurantMs.deselect(btn.dataset.value);
      });
    });
  }

  // ---- Filtering ----
  function getFilteredDeals() {
    return deals.filter(d => {
      if (!selectedNeighborhoods.has(d.neighborhood)) return false;
      if (!selectedRestaurants.has(d.restaurant)) return false;
      if (!selectedQualities.has(d.quality)) return false;
      if (selectedTags.size < allTags.length) {
        const dealTags = d.tags || [];
        if (dealTags.length === 0 || !dealTags.some(t => selectedTags.has(t))) return false;
      }
      const startHour = parseInt(d.startTime.split(':')[0]);
      if (!showLateNight && startHour >= 21) return false;
      return true;
    });
  }

  // ---- Grouping by day + time slot ----
  function groupByDayAndSlot(filteredDeals) {
    const dayOrder = [1, 2, 3, 4, 5, 6, 0];
    const result = {};

    dayOrder.forEach(day => {
      const dayDeals = filteredDeals.filter(d => d.daysOfWeek.includes(day));
      const buckets = {};
      TIME_SLOTS.forEach(slot => { buckets[slot.id] = { slot, deals: [] }; });

      dayDeals.forEach(deal => {
        const slot = getSlot(deal.startTime);
        buckets[slot.id].deals.push(deal);
      });

      result[day] = TIME_SLOTS
        .map(slot => {
          const b = buckets[slot.id];
          if (b.deals.length === 0) return null;
          // Compute actual time range from deals
          const starts = b.deals.map(d => d.startTime).sort();
          const ends = b.deals.map(d => d.endTime).sort();
          return {
            slot: b.slot,
            startTime: starts[0],
            endTime: ends[ends.length - 1],
            deals: b.deals,
          };
        })
        .filter(Boolean);
    });
    return result;
  }

  // ---- Rendering ----
  function renderGrid() {
    // Destroy existing tippy instances
    document.querySelectorAll('.block-item').forEach(item => {
      if (item._tippy) item._tippy.destroy();
    });

    const filtered = getFilteredDeals();
    const grouped = groupByDayAndSlot(filtered);

    const dayOrder = [1, 2, 3, 4, 5, 6, 0];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date().getDay();

    // Count totals per day for the header
    const dayCounts = {};
    dayOrder.forEach(day => {
      dayCounts[day] = (grouped[day] || []).reduce((sum, g) => sum + g.deals.length, 0);
    });

    const headers = document.getElementById('day-headers');
    headers.innerHTML = dayOrder.map((d, i) => {
      const isToday = d === today;
      const count = dayCounts[d] || 0;
      return `<div class="day-header${isToday ? ' today' : ''}">
        <span class="dh-name">${dayNames[i]}</span>
        <span class="dh-count">${count}</span>
      </div>`;
    }).join('');

    const grid = document.getElementById('time-grid');
    grid.innerHTML = dayOrder.map(day => {
      const groups = grouped[day] || [];
      const isToday = day === today;

      if (groups.length === 0) {
        return `<div class="day-column${isToday ? ' today' : ''}">
          <div class="empty-day">No deals</div>
        </div>`;
      }

      const blocksHtml = groups.map(group => {
        const timeRange = shortTimeRange(group.startTime, group.endTime);
        const sorted = [...group.deals].sort((a, b) =>
          qualityRank(b.quality) - qualityRank(a.quality) || a.restaurant.localeCompare(b.restaurant)
        );

        const MAX_COLLAPSED = 10;
        const needsExpand = sorted.length > MAX_COLLAPSED;
        const visibleDeals = needsExpand ? sorted.slice(0, MAX_COLLAPSED) : sorted;
        const hiddenDeals = needsExpand ? sorted.slice(MAX_COLLAPSED) : [];

        const listItems = (items, hidden) => items.map(deal => {
          const color = getColor(deal.neighborhood);
          const qb = deal.quality === 'A+' ? '<span class="q-badge">A+</span>' : '';
          const time = shortTimeRange(deal.startTime, deal.endTime);
          return `<div class="block-item${hidden ? ' block-item-hidden' : ''}" data-deal-id="${deal.id}">
            <span class="bi-dot" style="background:${color.bg}"></span>
            <span class="bi-name">${deal.restaurant}</span>
            <span class="bi-time">${time}</span>
            ${qb}
          </div>`;
        }).join('');

        const expandBtn = needsExpand
          ? `<div class="block-expand" data-action="expand">+${hiddenDeals.length} more</div>`
          : '';

        return `<div class="time-block" data-slot="${group.slot.id}" style="--slot-accent:${group.slot.accent}">
          <div class="block-header">
            <div class="block-label">
              <span class="block-slot-name">${group.slot.label}</span>
              <span class="block-time">${timeRange}</span>
            </div>
            <span class="block-count">${sorted.length}</span>
          </div>
          <div class="block-list">
            ${listItems(visibleDeals, false)}
            ${listItems(hiddenDeals, true)}
            ${expandBtn}
          </div>
        </div>`;
      }).join('');

      return `<div class="day-column${isToday ? ' today' : ''}">${blocksHtml}</div>`;
    }).join('');

    // Attach interactions
    document.querySelectorAll('.block-item').forEach(item => {
      const dealId = item.dataset.dealId;
      const deal = deals.find(d => d.id === dealId);
      if (!deal) return;

      tippy(item, {
        content: buildTooltip(deal),
        allowHTML: true,
        theme: 'happy-hour',
        placement: 'auto',
        maxWidth: 320,
        interactive: true,
        appendTo: document.body,
        delay: [150, 50],
      });

      item.addEventListener('click', () => showDetail(deal));
    });

    // Expand buttons
    document.querySelectorAll('.block-expand').forEach(btn => {
      btn.addEventListener('click', () => {
        const list = btn.closest('.block-list');
        list.classList.add('expanded');
        btn.style.display = 'none';
      });
    });
  }

  // ---- Detail panel ----
  function showDetail(deal) {
    const color = getColor(deal.neighborhood);
    const qc = deal.quality === 'A+' ? 'a-plus' : deal.quality === 'A' ? 'a' : deal.quality === 'B+' ? 'b-plus' : 'b';
    const dayMap = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };

    document.getElementById('detail-title').textContent = deal.restaurant;

    let html = '';
    html += `<div class="detail-quality ${qc}">${deal.quality}</div>`;
    html += `<div class="detail-meta">`;
    html += `<div class="detail-meta-row"><span class="detail-dot" style="background:${color.bg}"></span>${deal.neighborhood}</div>`;
    if (deal.address && deal.address !== deal.neighborhood) html += `<div class="detail-meta-row">${deal.address}</div>`;
    html += `<div class="detail-meta-row">${shortTimeRange(deal.startTime, deal.endTime)}</div>`;
    html += `<div class="detail-meta-row">${deal.daysOfWeek.map(d => dayMap[d]).join(', ')}</div>`;
    html += `</div>`;

    if (deal.drinks?.length) {
      html += `<div class="detail-section"><div class="detail-section-title">Drinks</div><ul>${deal.drinks.map(d => `<li>${d}</li>`).join('')}</ul></div>`;
    }
    if (deal.food?.length) {
      html += `<div class="detail-section"><div class="detail-section-title">Food</div><ul>${deal.food.map(f => `<li>${f}</li>`).join('')}</ul></div>`;
    }
    if (deal.normalPriceContext) {
      html += `<div class="detail-value">${deal.normalPriceContext}</div>`;
    }

    document.getElementById('detail-body').innerHTML = html;
    document.getElementById('detail-panel').classList.add('open');
    document.getElementById('detail-overlay').classList.add('open');
  }

  function closeDetail() {
    document.getElementById('detail-panel').classList.remove('open');
    document.getElementById('detail-overlay').classList.remove('open');
  }

  document.getElementById('detail-close').addEventListener('click', closeDetail);
  document.getElementById('detail-overlay').addEventListener('click', closeDetail);

  // Close detail on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetail();
  });

  // ---- Filter bindings ----
  function refresh() { renderGrid(); }

  const lateNightBtn = document.getElementById('late-night-toggle');
  lateNightBtn.addEventListener('click', () => {
    showLateNight = !showLateNight;
    lateNightBtn.classList.toggle('active', showLateNight);
    lateNightBtn.textContent = showLateNight ? 'Late Night ON' : 'Late Night';
    refresh();
  });

  // ---- Search ----
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const searchWrapper = document.getElementById('search-wrapper');

  // Build a unique restaurant list with summary info
  function getRestaurantSummaries() {
    const map = {};
    deals.forEach(d => {
      if (!map[d.restaurant]) {
        map[d.restaurant] = {
          name: d.restaurant,
          neighborhood: d.neighborhood,
          quality: d.quality,
          deals: [],
        };
      }
      map[d.restaurant].deals.push(d);
      // Keep highest quality
      if (qualityRank(d.quality) > qualityRank(map[d.restaurant].quality)) {
        map[d.restaurant].quality = d.quality;
      }
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }

  const allRestaurants = getRestaurantSummaries();

  function renderSearchResults(query) {
    const q = query.toLowerCase().trim();
    const matches = q === ''
      ? allRestaurants
      : allRestaurants.filter(r =>
          r.name.toLowerCase().includes(q) || r.neighborhood.toLowerCase().includes(q)
        );

    if (matches.length === 0) {
      searchResults.innerHTML = '<div class="sr-empty">No matches</div>';
      return;
    }

    searchResults.innerHTML = matches.map(r => {
      const color = getColor(r.neighborhood);
      const qc = r.quality === 'A+' ? 'a-plus' : r.quality === 'A' ? 'a' : r.quality === 'B+' ? 'b-plus' : 'b';
      const dayMap = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
      const allDays = [...new Set(r.deals.flatMap(d => d.daysOfWeek))].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
      const dayStr = allDays.length === 7 ? 'Daily' : allDays.map(d => dayMap[d]).join(', ');
      const times = r.deals.map(d => shortTimeRange(d.startTime, d.endTime));
      const uniqueTimes = [...new Set(times)].join(' / ');

      return `<div class="sr-item" data-restaurant="${r.name}">
        <div class="sr-top">
          <span class="sr-dot" style="background:${color.bg}"></span>
          <span class="sr-name">${r.name}</span>
          <span class="sr-quality ${qc}">${r.quality}</span>
        </div>
        <div class="sr-meta">${r.neighborhood} &middot; ${dayStr} &middot; ${uniqueTimes}</div>
      </div>`;
    }).join('');
  }

  searchInput.addEventListener('focus', () => {
    renderSearchResults(searchInput.value);
    searchWrapper.classList.add('open');
  });

  searchInput.addEventListener('input', () => {
    renderSearchResults(searchInput.value);
    searchWrapper.classList.add('open');
  });

  document.addEventListener('click', (e) => {
    if (!searchWrapper.contains(e.target)) {
      searchWrapper.classList.remove('open');
    }
  });

  searchResults.addEventListener('click', (e) => {
    const item = e.target.closest('.sr-item');
    if (!item) return;
    const name = item.dataset.restaurant;
    const deal = deals.find(d => d.restaurant === name);
    if (deal) showDetail(deal);
    searchWrapper.classList.remove('open');
    searchInput.value = '';
  });

  // Initial render
  renderGrid();
}

document.addEventListener('DOMContentLoaded', init);

/* ============================================
   CREATE A HUNT — Card-by-Card Builder
   Bar selection, auto-generated clues from KB,
   confirm/edit/regenerate flow, carousel preview
   ============================================ */

const CreateHunt = {
    bars: [],
    streets: [],
    selectedBar: null,
    currentSkin: 'ransom',
    currentCard: 0,
    clues: [],          // Confirmed clues (backwards compat with carousel/link gen)
    buildCards: [],      // All build cards (confirmed + current)
    currentBuildCard: null,
    _nearbySuggestions: [],
    _usedStreetIndices: new Set(),
    isEditingCard: false,

    async init() {
        await Promise.all([this.loadBars(), this.loadStreets()]);
        this.bindEvents();
    },

    async loadBars() {
        try {
            const res = await fetch('deals.json');
            const raw = await res.json();
            const seen = new Set();
            this.bars = raw.filter(b => {
                const key = b.restaurant.toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        } catch (e) { this.bars = []; }
    },

    async loadStreets() {
        try {
            const res = await fetch('la-street-names-kb.json');
            this.streets = await res.json();
        } catch (e) { this.streets = []; }
    },

    // ---- Bar Search ----
    searchBars(query) {
        const results = document.getElementById('bar-results');
        if (!query || query.length < 2) {
            results.innerHTML = '';
            return;
        }
        const q = query.toLowerCase();
        const matches = this.bars
            .filter(b => b.restaurant.toLowerCase().includes(q) || b.neighborhood.toLowerCase().includes(q))
            .slice(0, 8);

        results.innerHTML = matches.map(b => `
            <div class="bar-result-item" data-id="${b.id}">
                <strong>${b.restaurant}</strong>
                <span>${b.neighborhood} &middot; ${b.address || ''}</span>
            </div>
        `).join('');
    },

    selectBar(barId) {
        const bar = this.bars.find(b => b.id === barId);
        if (!bar) return;
        this.selectedBar = bar;

        document.getElementById('bar-search').value = '';
        document.getElementById('bar-results').innerHTML = '';
        document.getElementById('bar-search-wrap').hidden = true;

        document.getElementById('bar-pending-name').textContent = bar.restaurant;
        document.getElementById('bar-pending-detail').textContent =
            `${bar.neighborhood} — ${bar.address || ''}`;
        document.getElementById('bar-pending').hidden = false;
    },

    confirmBar() {
        if (!this.selectedBar) return;
        document.getElementById('bar-pending').hidden = true;

        document.getElementById('bar-confirmed-name').textContent = this.selectedBar.restaurant;
        document.getElementById('bar-confirmed-detail').textContent =
            `${this.selectedBar.neighborhood} — ${this.selectedBar.address || ''}`;
        document.getElementById('bar-confirmed').hidden = false;

        this.loadNearbySuggestions();
        this.showSuggestions();
        document.getElementById('clues-section').hidden = false;

        // Auto-generate first card
        this.buildNextCard();
    },

    changeBar() {
        this.selectedBar = null;
        this.buildCards = [];
        this.clues = [];
        this.currentBuildCard = null;
        this._usedStreetIndices.clear();
        document.getElementById('bar-pending').hidden = true;
        document.getElementById('bar-confirmed').hidden = true;
        document.getElementById('bar-search-wrap').hidden = false;
        document.getElementById('suggestions-section').hidden = true;
        document.getElementById('clues-section').hidden = true;
        document.getElementById('generate-section').hidden = true;
        document.getElementById('build-card').hidden = true;
        document.getElementById('build-cards-summary').innerHTML = '';
        document.getElementById('add-stop-btn').hidden = true;
        document.getElementById('bar-search').value = '';
        document.getElementById('bar-search').focus();
    },

    // ---- Street Suggestions ----
    loadNearbySuggestions() {
        const hood = this.selectedBar.neighborhood.toLowerCase();
        this._nearbySuggestions = this.streets.filter(s => {
            if (!s.neighborhoods) return false;
            return s.neighborhoods.some(n =>
                n.toLowerCase().includes(hood) || hood.includes(n.toLowerCase())
            );
        });
    },

    showSuggestions() {
        const nearby = this._nearbySuggestions;
        const grid = document.getElementById('suggestions-grid');
        if (nearby.length === 0) {
            grid.innerHTML = '<p class="no-suggestions">No street facts found for this neighborhood yet.</p>';
        } else {
            grid.innerHTML = nearby.map((s, i) => `
                <button class="suggestion-card" data-index="${i}">
                    <div class="suggestion-street">${s.street}</div>
                    <div class="suggestion-who">${s.namedAfter || s.who || ''}</div>
                    <div class="suggestion-fact">${s.facts && s.facts[0] ? s.facts[0] : ''}</div>
                </button>
            `).join('');
        }
        document.getElementById('suggestions-section').hidden = false;
    },

    useSuggestion(index) {
        const street = this._nearbySuggestions[index];
        if (!street) return;
        this._usedStreetIndices.add(index);
        const text = this.generateClueText(street);
        this.currentBuildCard = { text, answer: street.street, street, confirmed: false };
        this.renderBuildCard();
    },

    // ---- Clue Text Generation ----
    generateClueText(street) {
        const facts = street.facts || [];
        const who = street.who || street.namedAfter || 'someone';
        const year = street.year || '';
        const mainFact = facts[0] || '';

        if (year && mainFact) {
            return `In ${year}, ${who} ${mainFact.charAt(0).toLowerCase() + mainFact.slice(1)} Find the street named in their honor.`;
        } else if (mainFact) {
            return `${mainFact} Find the street that bears this name.`;
        }
        return `This street was named after ${who}. Find it.`;
    },

    // ---- Card-by-Card Build Flow ----
    buildNextCard() {
        // Pick an unused nearby street
        const nearby = this._nearbySuggestions;
        let pick = null;
        for (let i = 0; i < nearby.length; i++) {
            if (!this._usedStreetIndices.has(i)) {
                pick = nearby[i];
                this._usedStreetIndices.add(i);
                break;
            }
        }

        if (pick) {
            const text = this.generateClueText(pick);
            this.currentBuildCard = { text, answer: pick.street, street: pick, confirmed: false };
        } else {
            // No more nearby streets — blank card for manual entry
            this.currentBuildCard = { text: '', answer: '', street: null, confirmed: false };
        }

        this.isEditingCard = !this.currentBuildCard.text;
        this.renderBuildCard();
    },

    renderBuildCard() {
        const card = this.currentBuildCard;
        if (!card) return;

        const cardEl = document.getElementById('build-card');
        const num = this.buildCards.length + 1;
        cardEl.hidden = false;

        document.getElementById('build-card-label').textContent = `Clue ${num}`;
        document.getElementById('build-card-answer').textContent = card.answer || '?';

        const textEl = document.getElementById('build-card-text');
        const editEl = document.getElementById('build-card-edit');
        const actionsEl = document.getElementById('build-card-actions');

        if (this.isEditingCard) {
            textEl.hidden = true;
            editEl.hidden = false;
            editEl.value = card.text;
            editEl.focus();
            actionsEl.innerHTML = `
                <button class="build-btn build-btn-confirm" id="build-save">Save</button>
                ${card.street ? '<button class="build-btn build-btn-regen" id="build-regen">Regenerate</button>' : ''}
            `;
        } else {
            textEl.hidden = false;
            textEl.textContent = card.text;
            editEl.hidden = true;
            actionsEl.innerHTML = `
                <button class="build-btn build-btn-confirm" id="build-confirm">Confirm</button>
                <button class="build-btn build-btn-edit" id="build-edit">Edit</button>
                ${card.street ? '<button class="build-btn build-btn-regen" id="build-regen">Regenerate</button>' : ''}
            `;
        }

        // Scroll card into view
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    confirmBuildCard() {
        const card = this.currentBuildCard;
        if (!card || !card.text.trim()) return;

        // If no answer set, prompt (shouldn't happen with auto-gen but safety)
        if (!card.answer.trim()) {
            const answer = prompt('What is the answer to this clue?');
            if (!answer) return;
            card.answer = answer;
        }

        card.confirmed = true;
        this.buildCards.push({ ...card });
        this.clues.push({ text: card.text, answer: card.answer });
        this.currentBuildCard = null;

        this.renderBuildSummary();
        document.getElementById('build-card').hidden = true;

        const count = this.buildCards.length;
        if (count >= 3) {
            // Show "Add Another" + link generation
            document.getElementById('add-stop-btn').hidden = false;
            document.getElementById('generate-section').hidden = false;
            this.renderCarousel();
        } else {
            // Auto-generate next card
            this.buildNextCard();
        }
    },

    regenerateCard() {
        const nearby = this._nearbySuggestions;
        // Find an unused street
        let pick = null;
        for (let i = 0; i < nearby.length; i++) {
            if (!this._usedStreetIndices.has(i)) {
                pick = nearby[i];
                this._usedStreetIndices.add(i);
                break;
            }
        }
        if (pick) {
            this.currentBuildCard = {
                text: this.generateClueText(pick),
                answer: pick.street,
                street: pick,
                confirmed: false
            };
            this.isEditingCard = false;
            this.renderBuildCard();
        }
    },

    renderBuildSummary() {
        const el = document.getElementById('build-cards-summary');
        el.innerHTML = this.buildCards.map((card, i) => `
            <div class="build-summary-card">
                <span class="build-summary-check">&#10003;</span>
                <div class="build-summary-body">
                    <div class="build-summary-label">Clue ${i + 1}</div>
                    <div class="build-summary-text">${card.text}</div>
                </div>
                <span class="build-summary-answer">${card.answer}</span>
            </div>
        `).join('');
    },

    // ---- Carousel ----
    renderCarousel() {
        const viewport = document.getElementById('carousel-viewport');
        const dots = document.getElementById('carousel-dots');
        const count = this.clues.length;

        viewport.innerHTML = this.clues.map((_, i) => `
            <div class="carousel-card" data-card="${i}" id="card-preview-${i}">
                <div class="card-preview-step">Clue ${i + 1} of ${count}</div>
                <div class="card-preview-text" id="card-text-${i}">
                    ${this.clues[i].text || '<span class="card-empty">Clue ' + (i + 1) + '</span>'}
                </div>
            </div>
        `).join('');

        dots.innerHTML = this.clues.map((_, i) =>
            `<span class="dot${i === this.currentCard ? ' active' : ''}" data-index="${i}"></span>`
        ).join('');

        this.applySkinToCarousel();
        if (this.currentCard >= count) this.currentCard = count - 1;
        this.goToCard(this.currentCard);
    },

    applySkinToCarousel() {
        document.querySelectorAll('.carousel-card').forEach((card, i) => {
            card.className = `carousel-card skin-card-${this.currentSkin}`;
            card.dataset.card = i;
            this.updateCardPreview(i);
        });
    },

    updateCardPreview(index) {
        const textEl = document.getElementById(`card-text-${index}`);
        if (!textEl) return;
        const text = this.clues[index] ? this.clues[index].text : '';
        if (!text) {
            textEl.innerHTML = `<span class="card-empty">Clue ${index + 1}</span>`;
            return;
        }
        if (this.currentSkin === 'ransom') {
            textEl.innerHTML = renderRansomText(text);
        } else {
            textEl.textContent = text;
        }
    },

    goToCard(index) {
        const count = this.clues.length;
        if (index < 0) index = 0;
        if (index >= count) index = count - 1;
        this.currentCard = index;
        const viewport = document.getElementById('carousel-viewport');
        viewport.style.transform = `translateX(-${index * 100}%)`;

        document.querySelectorAll('.dot').forEach((d, i) =>
            d.classList.toggle('active', i === index)
        );
    },

    // ---- Skin ----
    setSkin(skin) {
        this.currentSkin = skin;
        document.querySelectorAll('.ctrl-btn').forEach(btn =>
            btn.classList.toggle('active', btn.dataset.skin === skin)
        );
        this.applySkinToCarousel();
    },

    // ---- Link Generation ----
    generateLink() {
        if (this.clues.length === 0) return;

        for (let i = 0; i < this.clues.length; i++) {
            if (!this.clues[i].text.trim() || !this.clues[i].answer.trim()) return;
        }

        const theme = document.getElementById('hunt-theme-input').value.trim() || 'A Custom Hunt';
        const bar = this.selectedBar;

        const data = {
            t: theme,
            b: `${bar.restaurant}|${bar.address || ''}|${bar.neighborhood}`,
            s: this.clues.map(c => ({
                c: c.text,
                a: c.answer,
                v: [c.answer.toLowerCase(), c.answer.toLowerCase().replace(/\s+(street|ave|avenue|blvd|boulevard|st)$/i, '')]
            }))
        };

        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
        const base = window.location.href.replace('create-hunt.html', 'hunt.html');
        const url = new URL(base);
        url.search = '';
        url.searchParams.set('skin', this.currentSkin);
        url.hash = `custom=${encoded}`;

        document.getElementById('create-result').hidden = false;
        document.getElementById('create-link').value = url.toString();
    },

    // ---- Clipboard ----
    async _copy(text) {
        if (navigator.clipboard && window.isSecureContext) {
            try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fall through */ }
        }
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, 99999);
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { /* noop */ }
        document.body.removeChild(ta);
        return ok;
    },

    async copyLink() {
        const input = document.getElementById('create-link');
        const btn = document.getElementById('create-copy');
        const copied = await this._copy(input.value);
        if (copied) {
            const orig = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = orig; }, 2000);
        } else {
            input.select();
        }
    },

    // ---- Events ----
    bindEvents() {
        // Bar search input
        const searchInput = document.getElementById('bar-search');
        searchInput.addEventListener('input', () => this.searchBars(searchInput.value));

        // Bar result click → pending
        document.getElementById('bar-results').addEventListener('click', e => {
            const item = e.target.closest('.bar-result-item');
            if (item) this.selectBar(item.dataset.id);
        });

        // Confirm bar
        document.getElementById('bar-confirm').addEventListener('click', () => this.confirmBar());

        // Different bar (from pending)
        document.getElementById('bar-change-pending').addEventListener('click', () => this.changeBar());

        // Change bar (from confirmed)
        document.getElementById('bar-change').addEventListener('click', () => this.changeBar());

        // Suggestions — tap to use in current build card
        document.getElementById('suggestions-grid').addEventListener('click', e => {
            const card = e.target.closest('.suggestion-card');
            if (card) this.useSuggestion(parseInt(card.dataset.index));
        });

        // Build card actions (delegated — buttons are re-rendered)
        document.getElementById('build-card').addEventListener('click', e => {
            const btn = e.target.closest('.build-btn');
            if (!btn) return;
            if (btn.id === 'build-confirm') {
                this.confirmBuildCard();
            } else if (btn.id === 'build-save') {
                // Save edited text
                const editEl = document.getElementById('build-card-edit');
                this.currentBuildCard.text = editEl.value.trim();
                // If no answer, prompt
                if (!this.currentBuildCard.answer) {
                    const answer = prompt('What is the answer to this clue?');
                    if (answer) this.currentBuildCard.answer = answer;
                }
                this.isEditingCard = false;
                this.renderBuildCard();
            } else if (btn.id === 'build-edit') {
                this.isEditingCard = true;
                this.renderBuildCard();
            } else if (btn.id === 'build-regen') {
                this.regenerateCard();
            }
        });

        // Add another clue (after 3+)
        document.getElementById('add-stop-btn').addEventListener('click', () => {
            this.buildNextCard();
        });

        // Carousel nav
        document.getElementById('carousel-prev').addEventListener('click', () => {
            if (this.currentCard > 0) this.goToCard(this.currentCard - 1);
        });
        document.getElementById('carousel-next').addEventListener('click', () => {
            if (this.currentCard < this.clues.length - 1) this.goToCard(this.currentCard + 1);
        });
        document.getElementById('carousel-dots').addEventListener('click', e => {
            const dot = e.target.closest('.dot');
            if (dot) this.goToCard(parseInt(dot.dataset.index));
        });

        // Skin buttons
        document.querySelectorAll('.ctrl-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setSkin(btn.dataset.skin));
        });

        // Generate + Copy
        document.getElementById('create-generate').addEventListener('click', () => this.generateLink());
        document.getElementById('create-copy').addEventListener('click', () => this.copyLink());

        // Arrow keys for carousel
        document.addEventListener('keydown', e => {
            if (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT') return;
            if (e.key === 'ArrowLeft' && this.currentCard > 0) this.goToCard(this.currentCard - 1);
            if (e.key === 'ArrowRight' && this.currentCard < this.clues.length - 1) this.goToCard(this.currentCard + 1);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => CreateHunt.init());

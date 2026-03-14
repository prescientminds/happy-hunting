/* ============================================
   CREATE A HUNT — Clue Builder + Live Preview
   3-phase bar selection, dynamic clue list,
   street suggestions, carousel preview, link gen
   ============================================ */

const CreateHunt = {
    bars: [],
    streets: [],
    selectedBar: null,
    currentSkin: 'ransom',
    currentCard: 0,
    clues: [],
    activeClueIndex: 0,

    async init() {
        await Promise.all([this.loadBars(), this.loadStreets()]);
        this.addClue();
        this.addClue();
        this.addClue();
        this.bindEvents();
    },

    async loadBars() {
        try {
            const res = await fetch('deals.json');
            const raw = await res.json();
            // Deduplicate by restaurant name
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

    // Phase 1 → Phase 2: Show pending confirmation
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

    // Phase 2 → Phase 3: Confirm bar, reveal builder
    confirmBar() {
        if (!this.selectedBar) return;
        document.getElementById('bar-pending').hidden = true;

        document.getElementById('bar-confirmed-name').textContent = this.selectedBar.restaurant;
        document.getElementById('bar-confirmed-detail').textContent =
            `${this.selectedBar.neighborhood} — ${this.selectedBar.address || ''}`;
        document.getElementById('bar-confirmed').hidden = false;

        this.showSuggestions();
        document.getElementById('clues-section').hidden = false;
        document.getElementById('generate-section').hidden = false;
        this.renderCarousel();
    },

    // Reset to Phase 1
    changeBar() {
        this.selectedBar = null;
        document.getElementById('bar-pending').hidden = true;
        document.getElementById('bar-confirmed').hidden = true;
        document.getElementById('bar-search-wrap').hidden = false;
        document.getElementById('suggestions-section').hidden = true;
        document.getElementById('clues-section').hidden = true;
        document.getElementById('generate-section').hidden = true;
        document.getElementById('bar-search').value = '';
        document.getElementById('bar-search').focus();
    },

    // ---- Dynamic Clue List ----
    addClue() {
        const index = this.clues.length;
        this.clues.push({ text: '', answer: '' });
        this.renderClueList();
        this.setActiveClue(index);
    },

    removeClue(index) {
        if (this.clues.length <= 1) return;
        this.clues.splice(index, 1);
        if (this.activeClueIndex >= this.clues.length) {
            this.activeClueIndex = this.clues.length - 1;
        }
        this.renderClueList();
        this.renderCarousel();
    },

    renderClueList() {
        const list = document.getElementById('clue-list');
        list.innerHTML = this.clues.map((clue, i) => {
            const isLast = i === this.clues.length - 1;
            const label = isLast ? `Clue ${i + 1} (final — leads to bar)` : `Clue ${i + 1}`;
            const active = i === this.activeClueIndex ? ' clue-item--active' : '';
            return `
            <div class="clue-item${active}" data-index="${i}">
                <div class="clue-item-header">
                    <span class="clue-item-label">${label}</span>
                    ${this.clues.length > 1 ? `<button class="clue-remove-btn" data-remove="${i}">&times;</button>` : ''}
                </div>
                <textarea class="clue-item-text" data-field="text" data-index="${i}" placeholder="Write the clue..." rows="3">${clue.text}</textarea>
                <input class="clue-item-answer" data-field="answer" data-index="${i}" placeholder="Answer (street name, place, word...)" value="${clue.answer}">
            </div>`;
        }).join('');
    },

    setActiveClue(index) {
        this.activeClueIndex = index;
        document.querySelectorAll('.clue-item').forEach((el, i) => {
            el.classList.toggle('clue-item--active', i === index);
        });
    },

    onClueInput(index, field, value) {
        if (index < this.clues.length) {
            this.clues[index][field] = value;
            this.updateCardPreview(index);
        }
    },

    // ---- Street Suggestions ----
    showSuggestions() {
        const hood = this.selectedBar.neighborhood.toLowerCase();
        const nearby = this.streets.filter(s => {
            if (!s.neighborhoods) return false;
            return s.neighborhoods.some(n =>
                n.toLowerCase().includes(hood) || hood.includes(n.toLowerCase())
            );
        });

        const grid = document.getElementById('suggestions-grid');
        if (nearby.length === 0) {
            grid.innerHTML = '<p class="no-suggestions">No street facts found for this neighborhood yet. Write your own clues below.</p>';
        } else {
            grid.innerHTML = nearby.map((s, i) => `
                <button class="suggestion-card" data-index="${i}">
                    <div class="suggestion-street">${s.street}</div>
                    <div class="suggestion-who">${s.namedAfter || s.who || ''}</div>
                    <div class="suggestion-fact">${s.facts && s.facts[0] ? s.facts[0] : ''}</div>
                </button>
            `).join('');
            this._nearbySuggestions = nearby;
        }
        document.getElementById('suggestions-section').hidden = false;
    },

    useSuggestion(index) {
        const street = this._nearbySuggestions && this._nearbySuggestions[index];
        if (!street) return;

        const facts = street.facts || [];
        const who = street.who || street.namedAfter || 'someone';
        const year = street.year || '';
        const mainFact = facts[0] || '';

        let template = '';
        if (year && mainFact) {
            template = `In ${year}, ${who} ${mainFact.charAt(0).toLowerCase() + mainFact.slice(1)} Find the street named in their honor.`;
        } else if (mainFact) {
            template = `${mainFact} Find the street that bears this name.`;
        } else {
            template = `This street was named after ${who}. Find it.`;
        }

        const i = this.activeClueIndex;
        this.clues[i].text = template;
        this.clues[i].answer = street.street;
        this.renderClueList();
        this.updateCardPreview(i);

        // Scroll to the clue
        const clueEl = document.querySelector(`.clue-item[data-index="${i}"]`);
        if (clueEl) clueEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
            textEl.innerHTML = this.renderRansomText(text);
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
        // Validate all clues have text and answer
        for (let i = 0; i < this.clues.length; i++) {
            if (!this.clues[i].text.trim()) {
                this.setActiveClue(i);
                this.renderClueList();
                const el = document.querySelector(`.clue-item[data-index="${i}"] .clue-item-text`);
                if (el) el.focus();
                return;
            }
            if (!this.clues[i].answer.trim()) {
                this.setActiveClue(i);
                this.renderClueList();
                const el = document.querySelector(`.clue-item[data-index="${i}"] .clue-item-answer`);
                if (el) el.focus();
                return;
            }
        }

        const theme = document.getElementById('hunt-theme-input').value.trim() || 'A Custom Hunt';
        const bar = this.selectedBar;

        // Compact JSON
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

    async copyLink() {
        const input = document.getElementById('create-link');
        const btn = document.getElementById('create-copy');
        try {
            await navigator.clipboard.writeText(input.value);
            const orig = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = orig; }, 2000);
        } catch (e) {
            input.select();
        }
    },

    // ---- Ransom Text ----
    renderRansomText(text) {
        const fonts = [
            'Georgia,serif', '"Arial Black",sans-serif', '"Courier New",monospace',
            '"Times New Roman",serif', '"Special Elite",cursive', '"Playfair Display",serif'
        ];
        const bgs = ['#ffffff', '#fff8dc', '#ffe4e1', '#e8f4f8', '#f0ffe0', '#f5f5dc'];
        const rots = [-2, -1, 0, 0, 1, 2];
        const pick = a => a[Math.floor(Math.random() * a.length)];

        return text.split(/\s+/).filter(w => w).map(word =>
            `<span class="ransom-word" style="font-family:${pick(fonts)};background:${pick(bgs)};transform:rotate(${pick(rots)}deg);font-size:${Math.random() > 0.5 ? '0.9em' : '1em'}">${word}</span>`
        ).join('');
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

        // Suggestions
        document.getElementById('suggestions-grid').addEventListener('click', e => {
            const card = e.target.closest('.suggestion-card');
            if (card) this.useSuggestion(parseInt(card.dataset.index));
        });

        // Clue list — delegated events
        document.getElementById('clue-list').addEventListener('click', e => {
            // Remove button
            const removeBtn = e.target.closest('.clue-remove-btn');
            if (removeBtn) {
                this.removeClue(parseInt(removeBtn.dataset.remove));
                return;
            }
            // Click on clue item to activate
            const item = e.target.closest('.clue-item');
            if (item && !e.target.closest('textarea') && !e.target.closest('input')) {
                this.setActiveClue(parseInt(item.dataset.index));
            }
        });

        document.getElementById('clue-list').addEventListener('input', e => {
            const el = e.target;
            if (el.dataset.field && el.dataset.index !== undefined) {
                this.onClueInput(parseInt(el.dataset.index), el.dataset.field, el.value);
            }
        });

        document.getElementById('clue-list').addEventListener('focus', e => {
            const el = e.target;
            if (el.dataset.index !== undefined) {
                this.setActiveClue(parseInt(el.dataset.index));
            }
        }, true);

        // Add stop
        document.getElementById('add-stop-btn').addEventListener('click', () => {
            this.addClue();
            if (!document.getElementById('generate-section').hidden) {
                this.renderCarousel();
            }
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

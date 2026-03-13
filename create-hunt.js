/* ============================================
   CREATE A HUNT — Clue Builder + Live Preview
   Bar selection, street suggestions, editor,
   carousel preview, link generation
   ============================================ */

const CreateHunt = {
    bars: [],
    streets: [],
    selectedBar: null,
    currentSkin: 'ransom',
    currentCard: 0,
    clues: [
        { text: '', answer: '' },
        { text: '', answer: '' },
        { text: '', answer: '' }
    ],

    async init() {
        await Promise.all([this.loadBars(), this.loadStreets()]);
        this.bindEvents();
    },

    async loadBars() {
        try {
            const res = await fetch('deals.json');
            this.bars = await res.json();
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
        if (!query || query.length < 2) {
            document.getElementById('bar-results').innerHTML = '';
            return;
        }
        const q = query.toLowerCase();
        const matches = this.bars
            .filter(b => b.restaurant.toLowerCase().includes(q) || b.neighborhood.toLowerCase().includes(q))
            .slice(0, 8);

        document.getElementById('bar-results').innerHTML = matches.map(b => `
            <div class="bar-result-item" data-id="${b.id}">
                <strong>${b.restaurant}</strong>
                <span>${b.neighborhood} &middot; ${b.address || ''}</span>
            </div>
        `).join('');
    },

    selectBar(barId) {
        this.selectedBar = this.bars.find(b => b.id === barId);
        if (!this.selectedBar) return;

        document.getElementById('bar-search').value = '';
        document.getElementById('bar-results').innerHTML = '';
        document.getElementById('bar-search').parentElement.hidden = true;
        document.getElementById('bar-selected').hidden = false;
        document.getElementById('bar-selected-name').textContent = this.selectedBar.restaurant;
        document.getElementById('bar-selected-detail').textContent =
            `${this.selectedBar.neighborhood} — ${this.selectedBar.address || ''}`;

        this.showSuggestions();
        document.getElementById('clues-section').hidden = false;
        document.getElementById('generate-section').hidden = false;
        this.renderCarousel();
    },

    changeBar() {
        this.selectedBar = null;
        document.getElementById('bar-selected').hidden = true;
        document.getElementById('bar-search').parentElement.hidden = false;
        document.getElementById('suggestions-section').hidden = true;
        document.getElementById('clues-section').hidden = true;
        document.getElementById('generate-section').hidden = true;
        document.getElementById('bar-search').focus();
    },

    // ---- Street Suggestions ----
    showSuggestions() {
        const hood = this.selectedBar.neighborhood.toLowerCase();
        const nearby = this.streets.filter(s => {
            if (!s.neighborhoods) return false;
            return s.neighborhoods.some(n => n.toLowerCase().includes(hood) || hood.includes(n.toLowerCase()));
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
            // Store for later reference
            this._nearbySuggestions = nearby;
        }
        document.getElementById('suggestions-section').hidden = false;
    },

    useSuggestion(index) {
        const street = this._nearbySuggestions[index];
        if (!street) return;

        // Build a template clue from the street facts
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

        // Put in current editor
        const editor = document.getElementById('editor-text');
        editor.textContent = template;
        this.clues[this.currentCard].text = template;

        // Pre-fill answer with street name
        const answerInput = document.getElementById('editor-answer');
        answerInput.value = street.street;
        this.clues[this.currentCard].answer = street.street;

        this.updateCardPreview(this.currentCard);
        editor.focus();
    },

    // ---- Carousel ----
    renderCarousel() {
        const viewport = document.getElementById('carousel-viewport');
        viewport.innerHTML = [0, 1, 2].map(i => `
            <div class="carousel-card" data-card="${i}" id="card-preview-${i}">
                <div class="card-preview-step">Clue ${i + 1} of 3</div>
                <div class="card-preview-text" id="card-text-${i}">
                    ${this.clues[i].text || '<span class="card-empty">Tap to write clue ' + (i + 1) + '</span>'}
                </div>
            </div>
        `).join('');
        this.applySkinToCarousel();
        this.goToCard(this.currentCard);
    },

    applySkinToCarousel() {
        const cards = document.querySelectorAll('.carousel-card');
        cards.forEach(card => {
            card.className = `carousel-card skin-card-${this.currentSkin}`;
            const i = parseInt(card.dataset.card);
            this.updateCardPreview(i);
        });
    },

    updateCardPreview(index) {
        const textEl = document.getElementById(`card-text-${index}`);
        if (!textEl) return;
        const text = this.clues[index].text;
        if (!text) {
            textEl.innerHTML = `<span class="card-empty">Tap to write clue ${index + 1}</span>`;
            return;
        }
        if (this.currentSkin === 'ransom') {
            textEl.innerHTML = this.renderRansomText(text);
        } else {
            textEl.textContent = text;
        }
    },

    goToCard(index) {
        this.currentCard = index;
        const viewport = document.getElementById('carousel-viewport');
        viewport.style.transform = `translateX(-${index * 100}%)`;

        // Update dots
        document.querySelectorAll('.dot').forEach((d, i) =>
            d.classList.toggle('active', i === index)
        );

        // Update editor
        document.getElementById('editor-label').textContent = `Clue ${index + 1}`;
        document.getElementById('editor-text').textContent = this.clues[index].text;
        document.getElementById('editor-answer').value = this.clues[index].answer;

        // Update hint for last clue
        if (index === 2) {
            document.getElementById('editor-hint-text').textContent =
                'This is the final clue — it should lead to the bar. The answer could be the bar\'s name.';
        } else {
            document.getElementById('editor-hint-text').textContent =
                'The answer unlocks the next clue. Keep it short — a street name, a bar name, a place.';
        }
    },

    // ---- Editor ----
    onEditorInput() {
        const text = document.getElementById('editor-text').textContent;
        this.clues[this.currentCard].text = text;
        this.updateCardPreview(this.currentCard);
    },

    onAnswerInput() {
        this.clues[this.currentCard].answer = document.getElementById('editor-answer').value;
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
        // Validate
        for (let i = 0; i < 3; i++) {
            if (!this.clues[i].text.trim()) {
                this.goToCard(i);
                document.getElementById('editor-text').focus();
                return;
            }
            if (!this.clues[i].answer.trim()) {
                this.goToCard(i);
                document.getElementById('editor-answer').focus();
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
        // Bar search
        const searchInput = document.getElementById('bar-search');
        searchInput.addEventListener('input', () => this.searchBars(searchInput.value));

        // Bar result click
        document.getElementById('bar-results').addEventListener('click', e => {
            const item = e.target.closest('.bar-result-item');
            if (item) this.selectBar(item.dataset.id);
        });

        // Change bar
        document.getElementById('bar-change').addEventListener('click', () => this.changeBar());

        // Suggestions
        document.getElementById('suggestions-grid').addEventListener('click', e => {
            const card = e.target.closest('.suggestion-card');
            if (card) this.useSuggestion(parseInt(card.dataset.index));
        });

        // Carousel nav
        document.getElementById('carousel-prev').addEventListener('click', () => {
            if (this.currentCard > 0) this.goToCard(this.currentCard - 1);
        });
        document.getElementById('carousel-next').addEventListener('click', () => {
            if (this.currentCard < 2) this.goToCard(this.currentCard + 1);
        });
        document.getElementById('carousel-dots').addEventListener('click', e => {
            const dot = e.target.closest('.dot');
            if (dot) this.goToCard(parseInt(dot.dataset.index));
        });

        // Click card to edit
        document.getElementById('carousel-viewport').addEventListener('click', e => {
            const card = e.target.closest('.carousel-card');
            if (card) {
                this.goToCard(parseInt(card.dataset.card));
                document.getElementById('editor-text').focus();
            }
        });

        // Editor
        document.getElementById('editor-text').addEventListener('input', () => this.onEditorInput());
        document.getElementById('editor-answer').addEventListener('input', () => this.onAnswerInput());

        // Skin
        document.querySelectorAll('.ctrl-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setSkin(btn.dataset.skin));
        });

        // Generate + Copy
        document.getElementById('create-generate').addEventListener('click', () => this.generateLink());
        document.getElementById('create-copy').addEventListener('click', () => this.copyLink());

        // Keyboard: arrow keys for carousel when not in editor
        document.addEventListener('keydown', e => {
            if (document.activeElement.id === 'editor-text' || document.activeElement.tagName === 'INPUT') return;
            if (e.key === 'ArrowLeft' && this.currentCard > 0) this.goToCard(this.currentCard - 1);
            if (e.key === 'ArrowRight' && this.currentCard < 2) this.goToCard(this.currentCard + 1);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => CreateHunt.init());

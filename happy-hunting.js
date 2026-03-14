/* ============================================
   HAPPY HUNTING — Landing Page + Send Flow
   Preview skins, generate invite links
   ============================================ */

const HappyHuntingLanding = {
    hunts: [],
    selectedHunt: null,
    selectedSkin: 'ransom',
    promoApplied: false,

    async init() {
        await this.loadHunts();
        this.renderHunts();
        this.bindEvents();
    },

    async loadHunts() {
        try {
            const res = await fetch('scavenger-hunt-schema.json');
            const data = await res.json();
            this.hunts = data.hunts.map(hunt => {
                // Derive steps from cluePool if no steps array
                if (!hunt.steps && hunt.cluePool) {
                    hunt.steps = [1, 2, 3].map((ring, i) => {
                        const pick = hunt.cluePool.find(c => c.ring === ring) || hunt.cluePool[i];
                        return { ...pick, stepNumber: i + 1 };
                    });
                }
                return hunt;
            });
        } catch (e) {
            this.hunts = [];
        }
    },

    // ---- Render Hunt Cards ----
    renderHunts() {
        const grid = document.getElementById('hunts-grid');
        grid.innerHTML = this.hunts.filter(h => h.cluePool && h.cluePool.length > 0).map(hunt => `
            <div class="hunt-card" data-hunt-id="${hunt.huntId}">
                <div class="hunt-card-bar">${hunt.bar.name}</div>
                <div class="hunt-card-hood">${hunt.bar.neighborhood}</div>
                <div class="hunt-card-theme">${hunt.theme}</div>
                <div class="hunt-card-meta">${hunt.totalWalkingDistance} walk &middot; 3 clues &middot; ${hunt.cluePool.length} variations</div>
                <div class="hunt-card-styles">
                    <button class="style-btn active" data-style="free" data-hunt="${hunt.huntId}">Basic</button>
                    <span class="style-divider"></span>
                    <button class="style-btn style-btn-premium" data-style="ransom" data-hunt="${hunt.huntId}">Ransom</button>
                    <button class="style-btn style-btn-premium" data-style="script" data-hunt="${hunt.huntId}">Script</button>
                    <button class="style-btn style-btn-premium" data-style="napkin" data-hunt="${hunt.huntId}">Napkin</button>
                </div>
                <div class="hunt-card-preview" id="preview-${hunt.huntId}"></div>
                <div class="hunt-card-bottom" id="bottom-${hunt.huntId}">
                    <a href="hunt.html?hunt=${hunt.huntId}" class="hunt-card-preview-btn" target="_blank">Preview Hunt</a>
                    <button class="hunt-card-copy" data-hunt-id="${hunt.huntId}">Copy Link</button>
                </div>
            </div>
        `).join('');
    },

    // ---- Style Selection ----
    selectStyle(huntId, style) {
        const card = document.querySelector(`.hunt-card[data-hunt-id="${huntId}"]`);
        card.querySelectorAll('.style-btn').forEach(btn =>
            btn.classList.toggle('active', btn.dataset.style === style)
        );

        const preview = document.getElementById(`preview-${huntId}`);
        const bottom = document.getElementById(`bottom-${huntId}`);
        const hunt = this.hunts.find(h => h.huntId === huntId);

        if (style === 'free') {
            preview.innerHTML = '';
            preview.className = 'hunt-card-preview';
            bottom.innerHTML = `
                <a href="hunt.html?hunt=${huntId}" class="hunt-card-preview-btn" target="_blank">Preview Hunt</a>
                <button class="hunt-card-copy" data-hunt-id="${huntId}">Copy Link</button>
            `;
        } else {
            this.renderPreview(huntId, style, hunt);
            bottom.innerHTML = `
                <a href="hunt.html?hunt=${huntId}" class="hunt-card-preview-btn" target="_blank">Preview Hunt</a>
                <button class="hunt-card-send" data-hunt-id="${huntId}" data-skin="${style}">Send Invitation &mdash; $5</button>
            `;
        }
    },

    // ---- Preview Rendering ----
    renderPreview(huntId, skin, hunt) {
        const preview = document.getElementById(`preview-${huntId}`);
        const firstClue = hunt.steps[0].clue;
        const clueHtml = skin === 'ransom'
            ? this.renderRansomText(firstClue)
            : `<span>${firstClue}</span>`;

        preview.className = `hunt-card-preview preview-${skin} visible`;
        preview.innerHTML = `
            <div class="preview-step">Clue 1 of ${hunt.steps.length}</div>
            <div class="preview-clue">${clueHtml}</div>
            <div class="preview-fade"></div>
        `;
    },

    renderRansomText(text) {
        const fonts = [
            'Georgia,serif', '"Arial Black",sans-serif', '"Courier New",monospace',
            '"Times New Roman",serif', 'Impact,sans-serif', '"Special Elite",cursive',
            '"Playfair Display",serif', 'Verdana,sans-serif'
        ];
        const bgs = [
            '#ffffff', '#fff8dc', '#ffe4e1', '#e8f4f8', '#f0ffe0',
            '#fff0f5', '#f5f5dc', '#e6e6fa', '#fdf5e6', '#f0f8ff'
        ];
        const rots = [-3, -2.5, -1.5, -1, 0, 0, 0, 1, 1.5, 2.5, 3];
        const sizes = ['0.82em', '0.88em', '0.92em', '1em', '1em', '1.05em', '1.1em'];
        const pick = a => a[Math.floor(Math.random() * a.length)];

        return text.split(/\s+/).map(word => {
            const bold = Math.random() > 0.75 ? 'font-weight:700;' : '';
            return `<span class="ransom-word" style="font-family:${pick(fonts)};background:${pick(bgs)};transform:rotate(${pick(rots)}deg);font-size:${pick(sizes)};${bold}">${word}</span>`;
        }).join('');
    },

    // ---- Free Link Copy ----
    async copyFreeLink(huntId) {
        const base = window.location.href.replace('happy-hunting.html', 'hunt.html');
        const url = new URL(base);
        url.search = '';
        url.searchParams.set('hunt', huntId);
        try {
            await navigator.clipboard.writeText(url.toString());
            const btn = document.querySelector(`.hunt-card-copy[data-hunt-id="${huntId}"]`);
            if (btn) {
                const orig = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = orig; }, 2000);
            }
        } catch (e) {
            prompt('Copy this link:', url.toString());
        }
    },

    // ---- Send Modal ----
    openSendModal(huntId, skin) {
        this.selectedHunt = this.hunts.find(h => h.huntId === huntId);
        this.selectedSkin = skin;
        if (!this.selectedHunt) return;

        document.getElementById('send-title').textContent = this.selectedHunt.theme;
        document.getElementById('send-bar').textContent =
            this.selectedHunt.bar.name + ' — ' + this.selectedHunt.bar.neighborhood;
        document.getElementById('send-skin-label').textContent = skin.charAt(0).toUpperCase() + skin.slice(1);

        // Reset
        document.getElementById('send-form').hidden = false;
        document.getElementById('send-result').hidden = true;
        document.getElementById('sender-name').value = '';
        document.getElementById('recipient-name').value = '';
        document.getElementById('recipient-phone').value = '';
        document.getElementById('promo-code').value = '';
        document.getElementById('promo-feedback').textContent = '';
        document.getElementById('promo-feedback').className = 'promo-feedback';
        document.getElementById('send-generate').textContent = 'Generate Invitation — $5';
        this.promoApplied = false;

        document.getElementById('send-overlay').classList.add('visible');
    },

    closeSendModal() {
        document.getElementById('send-overlay').classList.remove('visible');
    },

    checkPromo() {
        const code = document.getElementById('promo-code').value.trim().toLowerCase();
        const feedback = document.getElementById('promo-feedback');
        const btn = document.getElementById('send-generate');

        if (code === 'prescientminds') {
            this.promoApplied = true;
            feedback.textContent = 'Applied — invitation is free';
            feedback.className = 'promo-feedback valid';
            btn.textContent = 'Generate Invitation — Free';
        } else if (code.length > 0) {
            this.promoApplied = false;
            feedback.textContent = 'Invalid code';
            feedback.className = 'promo-feedback invalid';
            btn.textContent = 'Generate Invitation — $5';
        } else {
            this.promoApplied = false;
            feedback.textContent = '';
            feedback.className = 'promo-feedback';
            btn.textContent = 'Generate Invitation — $5';
        }
    },

    generateLink() {
        const senderName = document.getElementById('sender-name').value.trim();
        const recipientName = document.getElementById('recipient-name').value.trim();
        const phone = document.getElementById('recipient-phone').value.replace(/\D/g, '');

        if (!senderName) { document.getElementById('sender-name').focus(); return; }
        if (!recipientName) { document.getElementById('recipient-name').focus(); return; }
        if (phone.length < 4) { document.getElementById('recipient-phone').focus(); return; }

        const last4 = phone.slice(-4);
        const key = btoa(last4 + ':' + this.selectedHunt.huntId).replace(/=/g, '');

        const base = window.location.href.replace('happy-hunting.html', 'hunt.html');
        const url = new URL(base);
        url.search = '';
        url.searchParams.set('hunt', this.selectedHunt.huntId);
        url.searchParams.set('skin', this.selectedSkin);
        url.searchParams.set('from', senderName);
        url.searchParams.set('to', recipientName);
        url.searchParams.set('key', key);

        document.getElementById('send-form').hidden = true;
        document.getElementById('send-result').hidden = false;
        document.getElementById('send-link').value = url.toString();
        document.getElementById('send-preview-text').textContent = senderName;
    },

    async copyLink() {
        const input = document.getElementById('send-link');
        const btn = document.getElementById('send-copy');
        try {
            await navigator.clipboard.writeText(input.value);
            const orig = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = orig; }, 2000);
        } catch (e) {
            input.select();
        }
    },

    // ---- Events ----
    bindEvents() {
        const grid = document.getElementById('hunts-grid');

        // Style buttons
        grid.addEventListener('click', e => {
            const styleBtn = e.target.closest('.style-btn');
            if (styleBtn) {
                this.selectStyle(styleBtn.dataset.hunt, styleBtn.dataset.style);
                return;
            }
            const copyBtn = e.target.closest('.hunt-card-copy');
            if (copyBtn) {
                this.copyFreeLink(copyBtn.dataset.huntId);
                return;
            }
            const sendBtn = e.target.closest('.hunt-card-send');
            if (sendBtn) {
                this.openSendModal(sendBtn.dataset.huntId, sendBtn.dataset.skin);
                return;
            }
        });

        // Modal close
        document.getElementById('send-close').addEventListener('click', () => this.closeSendModal());
        document.getElementById('send-overlay').addEventListener('click', e => {
            if (e.target === e.currentTarget) this.closeSendModal();
        });

        // Promo code
        document.getElementById('promo-code').addEventListener('input', () => this.checkPromo());

        // Generate + copy
        document.getElementById('send-generate').addEventListener('click', () => this.generateLink());
        document.getElementById('send-copy').addEventListener('click', () => this.copyLink());
        document.getElementById('send-another').addEventListener('click', () => {
            document.getElementById('send-form').hidden = false;
            document.getElementById('send-result').hidden = true;
        });
    }
};

document.addEventListener('DOMContentLoaded', () => HappyHuntingLanding.init());

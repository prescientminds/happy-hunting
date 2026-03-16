/* ============================================
   HAPPY HUNTING — Hunt Engine
   Envelope unlock, clue cards, answer validation,
   difficulty levels, preview mode, photo answers
   ============================================ */

const HappyHunting = {
    hunt: null,
    currentStep: 0,
    skin: 'ransom',
    wrongAttempts: 0,
    isInvite: false,
    isPreview: false,
    senderName: '',
    recipientName: '',
    urlKey: '',
    hasPool: false,
    difficultyLevel: 1,
    els: {},
    screens: {},
    isEditing: false,
    editedClues: {},
    lockedClues: {},
    addedCluesCount: 0,
    addedCluesCost: 0,
    promoApplied: false,

    cacheElements() {
        [
            'hunt-theme', 'begin-btn', 'skin-selector',
            'step-label', 'clue-text', 'clue-body',
            'answer-section', 'answer-input', 'submit-btn',
            'answer-feedback', 'fact-reveal', 'fact-text',
            'next-btn', 'arrival-bar', 'arrival-address',
            'arrival-hh', 'arrival-vibe', 'arrival-arc',
            'arrival-details', 'envelope-sender', 'unlock-feedback',
            'envelope', 'code-row',
            'difficulty-selector', 'diff-pips', 'diff-minus', 'diff-plus',
            'intro-next', 'intro-brand-graphic', 'amor-fati-row',
            'clue-next-btn',
            'answer-row-text', 'answer-row-photo', 'photo-done-btn',
            'preview-prev', 'preview-next',
            'stuck-btn', 'see-answer-btn', 'preview-answer-block',
            'preview-answer-text', 'hunt-back',
            'visual-intervention', 'clue-edit-field',
            'clue-edit-btn', 'clue-save-btn',
            'dice-roll-btn',
            'peek-prev', 'peek-next',
            'preview-start-btn', 'preview-carousel',
            'cost-bar', 'cost-bar-count', 'cost-bar-total',
            'cost-promo', 'cost-promo-apply', 'cost-checkout'
        ].forEach(id => {
            this.els[id] = document.getElementById(id);
        });
        this.screens = {
            envelope: document.getElementById('envelope-screen'),
            intro: document.getElementById('intro-screen'),
            clue: document.getElementById('clue-screen'),
            arrival: document.getElementById('arrival-screen'),
            error: document.getElementById('error-screen')
        };
    },

    async init() {
        this.cacheElements();
        const params = new URLSearchParams(window.location.search);
        this.skin = params.get('skin') || '';
        this.senderName = params.get('from') || '';
        this.recipientName = params.get('to') || '';
        this.urlKey = params.get('key') || '';
        this.isInvite = !!(this.senderName && this.urlKey);

        // Preview mode: no skin, or explicit preview param
        this.isPreview = (!this.skin || this.skin === 'free' || params.get('preview') === '1') && !this.isInvite;

        if (this.isPreview) {
            this.skin = 'preview';
            this.els['hunt-back'].hidden = false;
        }

        this.applySkin(this.skin);

        // Check for custom hunt in URL hash
        const hash = window.location.hash;
        if (hash.startsWith('#custom=')) {
            this.loadCustomHunt(hash.slice(8));
        } else {
            const hParam = params.get('h');
            let huntId;
            if (hParam) {
                // Re-pad base64 (padding may have been stripped to avoid URL encoding)
                const padded = hParam + '='.repeat((4 - hParam.length % 4) % 4);
                huntId = atob(padded);
            } else {
                huntId = params.get('hunt') || 'thunderbolt';
            }
            await this.loadHunt(huntId);
        }

        if (!this.hunt) {
            this.showScreen('error');
            return;
        }

        // Derive steps from cluePool if present
        if (this.hunt.cluePool && this.hunt.cluePool.length > 0) {
            this.hasPool = true;
            if (!this.hunt.steps) {
                this.hunt.steps = this.assembleSteps();
            }
        }

        if (this.isInvite) {
            this.renderEnvelope();
        } else {
            this.renderIntro();
        }

        this.bindEvents();
    },

    // ---- Data ----
    async loadHunt(huntId) {
        try {
            const res = await fetch('scavenger-hunt-schema.json');
            const data = await res.json();
            this.hunt = data.hunts.find(h => h.huntId === huntId);
        } catch (e) {
            this.hunt = null;
        }
    },

    loadCustomHunt(encoded) {
        try {
            const json = decodeURIComponent(escape(atob(encoded)));
            const data = JSON.parse(json);
            const barParts = data.b.split('|');
            this.hunt = {
                huntId: 'custom',
                theme: data.t || 'A Custom Hunt',
                bar: {
                    name: barParts[0] || '',
                    address: barParts[1] || '',
                    neighborhood: barParts[2] || ''
                },
                totalWalkingDistance: '',
                narrativeArc: '',
                steps: data.s.map((s, i) => ({
                    stepNumber: i + 1,
                    clue: s.c,
                    answer: s.a,
                    answerVariants: s.v || [s.a.toLowerCase()],
                    historicalFact: ''
                }))
            };
        } catch (e) {
            this.hunt = null;
        }
    },

    // ---- Clue Pool + Difficulty ----
    assembleSteps() {
        const pool = this.hunt.cluePool;
        const rings = [1, 2, 3];
        return rings.map((ring, i) => {
            const candidates = pool.filter(c => c.ring === ring);
            const pick = candidates[0] || pool[i];
            return { ...pick, stepNumber: i + 1 };
        });
    },

    getPoolForCurrentRing() {
        if (!this.hasPool) return [];
        const currentRing = this.hunt.steps[this.currentStep].ring;
        return this.hunt.cluePool.filter(c => c.ring === currentRing);
    },

    setDifficulty(level) {
        const candidates = this.getPoolForCurrentRing();
        const sorted = candidates.slice().sort((a, b) => (a.difficulty || 0) - (b.difficulty || 0));
        const max = sorted.length || 1;
        if (level < 1) level = 1;
        if (level > max) level = max;
        this.difficultyLevel = level;

        // Update pip highlights
        this.els['diff-pips'].querySelectorAll('.diff-pip').forEach(pip => {
            pip.classList.toggle('active', parseInt(pip.dataset.level) === level);
        });

        if (!this.hasPool || sorted.length === 0) return;

        let pick = sorted.find(c => c.difficulty === level) || sorted[level - 1];

        if (pick.clue !== this.hunt.steps[this.currentStep].clue) {
            this.hunt.steps[this.currentStep] = { ...pick, stepNumber: this.currentStep + 1 };
            this.renderClueContent();
            this.resetPreviewAnswer();
        }
    },

    renderDifficultyPips() {
        const pipsEl = this.els['diff-pips'];
        if (!pipsEl) return;
        const candidates = this.getPoolForCurrentRing();
        const count = candidates.length || 1;
        pipsEl.innerHTML = '';
        for (let i = 1; i <= count; i++) {
            const pip = document.createElement('button');
            pip.className = 'diff-pip' + (i === this.difficultyLevel ? ' active' : '');
            pip.dataset.level = i;
            pip.textContent = i;
            pipsEl.appendChild(pip);
        }
    },

    // ---- Lock Clue (implicit — called by Save and Next) ----
    lockClue() {
        const step = this.hunt.steps[this.currentStep];
        this.lockedClues[this.currentStep] = { ...step };
    },

    // ---- Skin ----
    applySkin(skin) {
        this.skin = skin;
        document.body.className = `skin-${skin}`;
        const url = new URL(window.location);
        url.searchParams.set('skin', skin);
        window.history.replaceState({}, '', url);
        document.querySelectorAll('.skin-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.skin === skin);
        });
        if (this.screens.clue.classList.contains('active') && this.hunt) {
            this.renderClueText(this.hunt.steps[this.currentStep].clue);
        }
    },

    // ---- Screens ----
    showScreen(name) {
        Object.values(this.screens).forEach(s => s.classList.remove('active'));
        if (this.screens[name]) this.screens[name].classList.add('active');
    },

    // ---- Envelope ----
    renderEnvelope() {
        let text;
        if (this.recipientName && this.senderName) {
            text = `${this.recipientName}, ${this.senderName} sent you a clue`;
        } else if (this.senderName) {
            text = `${this.senderName} sent you a clue`;
        } else {
            text = 'Someone sent you a clue';
        }
        this.els['envelope-sender'].textContent = text;
        this.showScreen('envelope');
        setTimeout(() => {
            const first = document.querySelector('.code-digit');
            if (first) first.focus();
        }, 900);
    },

    verifyCode(digits) {
        const computed = btoa(digits + ':' + this.hunt.huntId).replace(/=/g, '');
        if (computed === this.urlKey) {
            this.onUnlock();
        } else {
            this.onWrongCode();
        }
    },

    onUnlock() {
        const digits = document.querySelectorAll('.code-digit');
        const envelope = this.els['envelope'];
        digits.forEach(d => d.classList.add('correct'));
        setTimeout(() => { envelope.classList.add('opening'); }, 500);
        setTimeout(() => { this.renderIntro(); }, 1200);
    },

    onWrongCode() {
        const digits = document.querySelectorAll('.code-digit');
        const row = this.els['code-row'];
        digits.forEach(d => d.classList.add('wrong'));
        row.classList.add('shake');
        setTimeout(() => {
            row.classList.remove('shake');
            digits.forEach(d => { d.value = ''; d.classList.remove('wrong'); });
            digits[0].focus();
        }, 600);
        this.els['unlock-feedback'].textContent = 'Not quite. Try again.';
    },

    // ---- Intro ----
    renderIntro() {
        this.els['hunt-theme'].textContent = this.hunt.theme;
        const count = this.hunt.steps ? this.hunt.steps.length : 3;
        const meta = document.getElementById('intro-meta');
        if (meta) {
            const label = this.isPreview ? 'Preview' : 'Start walking';
            meta.innerHTML = `${count} clues. One destination.<br>${label}.`;
        }
        if (this.isPreview) {
            // Preview: show Start button + forward arrow + brand graphic
            this.els['skin-selector'].style.display = 'none';
            this.els['begin-btn'].hidden = true;
            this.els['preview-start-btn'].hidden = false;
            this.els['intro-next'].hidden = false;
            this.els['intro-brand-graphic'].hidden = false;
        } else if (this.isInvite) {
            this.els['skin-selector'].style.display = 'none';
        }
        this.showScreen('intro');
    },

    // ---- Clue Rendering ----
    renderClue() {
        // Clean up any in-flight stuck call or timeout from previous clue
        if (this.stuckTimeout) clearTimeout(this.stuckTimeout);
        this.cancelStuckCall();

        const step = this.hunt.steps[this.currentStep];
        this.els['step-label'].textContent = `Clue ${step.stepNumber} of ${this.hunt.steps.length}`;

        this.renderClueContent();

        // Difficulty + Amor Fati: show for pool hunts in preview mode
        const showDiff = this.hasPool && this.isPreview;
        this.els['difficulty-selector'].hidden = !showDiff;
        this.els['amor-fati-row'].hidden = !showDiff;
        if (showDiff) {
            this.renderDifficultyPips();
        }

        if (this.isPreview) {
            // Preview mode: hide interactive answer, show consolidated answer block
            this.els['answer-section'].hidden = true;
            this.els['preview-answer-block'].hidden = false;
            this.els['see-answer-btn'].hidden = false;
            this.els['see-answer-btn'].textContent = 'See Answer';
            this.els['preview-answer-text'].textContent = '';
            this.els['preview-answer-text'].hidden = true;
            this.els['fact-reveal'].classList.remove('visible');

            // Navigation arrows
            this.els['preview-prev'].hidden = this.currentStep === 0;
            const isLast = this.currentStep === this.hunt.steps.length - 1;
            // Show next arrow if not last, OR if last and past 3 cards (add clue available)
            this.els['preview-next'].hidden = isLast && !(isLast && this.currentStep >= 2);

            // Edit state
            this.isEditing = false;
            this.els['clue-text'].hidden = false;
            this.els['clue-edit-field'].hidden = true;
            this.els['clue-edit-btn'].hidden = false;
            this.els['clue-save-btn'].hidden = true;

            // Next Clue button text
            if (isLast && this.currentStep >= 2) {
                this.els['clue-next-btn'].innerHTML = '+ Add Clue &mdash; $1';
                this.els['clue-next-btn'].dataset.action = 'add';
            } else if (isLast) {
                this.els['clue-next-btn'].innerHTML = 'Done &rarr;';
                this.els['clue-next-btn'].dataset.action = 'done';
            } else {
                this.els['clue-next-btn'].innerHTML = 'Next Clue &rarr;';
                this.els['clue-next-btn'].dataset.action = 'next';
            }

            // Peek cards
            this.renderPeekCards();
            this.renderIntervention();
        } else {
            // Interactive mode: show answers, hide preview elements
            this.els['answer-section'].hidden = false;
            this.els['preview-answer-block'].hidden = true;
            this.els['preview-prev'].hidden = true;
            this.els['preview-next'].hidden = true;
            this.els['amor-fati-row'].hidden = true;
            this.els['peek-prev'].hidden = true;
            this.els['peek-next'].hidden = true;
            this.els['visual-intervention'].innerHTML = '';

            // Photo vs text answer
            const isPhoto = step.answerType === 'photo';
            this.els['answer-row-text'].hidden = isPhoto;
            this.els['answer-row-photo'].hidden = !isPhoto;

            // "I'm stuck" button: show after a delay, hidden initially
            this.els['stuck-btn'].hidden = true;
            this.stuckTimeout = setTimeout(() => {
                this.els['stuck-btn'].hidden = false;
            }, 8000); // appears after 8 seconds

            // Reset state
            this.els['answer-section'].classList.remove('solved');
            this.els['answer-input'].value = '';
            this.els['answer-input'].disabled = false;
            this.els['answer-feedback'].textContent = '';
            this.els['answer-feedback'].className = 'answer-feedback';
            this.els['fact-reveal'].classList.remove('visible');
            this.wrongAttempts = 0;

            const isLast = this.currentStep === this.hunt.steps.length - 1;
            this.els['next-btn'].innerHTML = isLast ? 'You\'ve arrived &rarr;' : 'Next Clue &rarr;';

            if (!isPhoto) {
                setTimeout(() => this.els['answer-input'].focus(), 500);
            }
        }

        this.showScreen('clue');
    },

    renderClueContent() {
        const step = this.hunt.steps[this.currentStep];
        this.renderClueText(step.clue);
    },

    renderClueText(text) {
        if (this.isPreview) {
            // Preview mode: always plain text
            this.els['clue-text'].textContent = text;
        } else if (this.skin === 'ransom') {
            this.els['clue-text'].innerHTML = renderRansomText(text);
        } else {
            this.els['clue-text'].textContent = text;
        }
    },

    // ---- Answer Validation ----
    checkAnswer() {
        const input = this.els['answer-input'].value.trim();
        if (!input) return;

        const step = this.hunt.steps[this.currentStep];
        const norm = input.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
        const variants = step.answerVariants.map(v =>
            v.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
        );

        if (variants.includes(norm)) {
            this.onCorrect(step);
        } else {
            this.onWrong(step);
        }
    },

    solvePhoto() {
        const step = this.hunt.steps[this.currentStep];
        this.els['answer-feedback'].textContent = 'Nice shot.';
        this.els['answer-feedback'].className = 'answer-feedback correct';
        this.els['answer-section'].classList.add('solved');
        this.els['fact-text'].textContent = step.historicalFact;
        setTimeout(() => this.els['fact-reveal'].classList.add('visible'), 400);
    },

    onCorrect(step) {
        this.els['answer-input'].disabled = true;
        this.els['answer-feedback'].textContent = step.answer;
        this.els['answer-feedback'].className = 'answer-feedback correct';
        this.els['answer-section'].classList.add('solved');

        this.els['answer-input'].classList.add('pulse-correct');
        setTimeout(() => this.els['answer-input'].classList.remove('pulse-correct'), 600);

        this.els['fact-text'].textContent = step.historicalFact;
        setTimeout(() => this.els['fact-reveal'].classList.add('visible'), 400);

        // Scroll next button into view on mobile
        setTimeout(() => {
            this.els['next-btn'].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 500);
    },

    onWrong(step) {
        this.wrongAttempts++;
        this.els['answer-feedback'].textContent = 'Not quite. Try again.';
        this.els['answer-feedback'].className = 'answer-feedback wrong';

        this.els['answer-input'].classList.add('shake');
        setTimeout(() => this.els['answer-input'].classList.remove('shake'), 350);

        if (this.wrongAttempts >= 3 && step.answer) {
            this.els['answer-feedback'].textContent = `Hint: starts with "${step.answer.charAt(0)}"`;
        }

        this.els['answer-input'].select();
    },

    // ---- Preview: See Answer (toggle) ----
    toggleAnswer() {
        const isVisible = !this.els['preview-answer-text'].hidden;
        if (isVisible) {
            // Hide answer
            this.els['preview-answer-text'].hidden = true;
            this.els['preview-answer-text'].textContent = '';
            this.els['see-answer-btn'].textContent = 'See Answer';
        } else {
            // Show answer
            const step = this.hunt.steps[this.currentStep];
            const answer = step.answer || '(no answer set)';
            this.els['preview-answer-text'].textContent = answer;
            this.els['preview-answer-text'].hidden = false;
            this.els['see-answer-btn'].textContent = 'Hide Answer';
        }
    },

    // ---- Preview: Reset Answer on Difficulty Change ----
    resetPreviewAnswer() {
        if (!this.isPreview) return;
        this.els['see-answer-btn'].hidden = false;
        this.els['see-answer-btn'].textContent = 'See Answer';
        this.els['preview-answer-text'].textContent = '';
        this.els['preview-answer-text'].hidden = true;
    },

    // ---- Edit Clue ----
    toggleEdit() {
        this.isEditing = true;
        const step = this.hunt.steps[this.currentStep];
        this.els['clue-edit-field'].value = step.clue;
        this.els['clue-text'].hidden = true;
        this.els['clue-edit-field'].hidden = false;
        this.els['clue-edit-field'].focus();
        this.els['clue-edit-btn'].hidden = true;
        this.els['clue-save-btn'].hidden = false;
    },

    saveClue() {
        const text = this.els['clue-edit-field'].value.trim();
        if (!text) return;
        this.isEditing = false;
        const step = this.hunt.steps[this.currentStep];
        step.clue = text;
        this.editedClues[this.currentStep] = true;
        this.renderClueText(text);
        this.els['clue-text'].hidden = false;
        this.els['clue-edit-field'].hidden = true;
        this.els['clue-edit-btn'].hidden = false;
        this.els['clue-save-btn'].hidden = true;
        this.lockClue();
    },

    // ---- Dice Roll: Amor Fati ----
    rollDice() {
        const candidates = this.getPoolForCurrentRing();
        if (candidates.length === 0) return;
        const btn = this.els['dice-roll-btn'];
        btn.classList.add('dice-rolling');
        setTimeout(() => {
            btn.classList.remove('dice-rolling');
            const pick = candidates[Math.floor(Math.random() * candidates.length)];
            this.hunt.steps[this.currentStep] = { ...pick, stepNumber: this.currentStep + 1 };
            this.renderClueContent();
            this.resetPreviewAnswer();
            const sorted = candidates.slice().sort((a, b) => (a.difficulty || 0) - (b.difficulty || 0));
            const idx = sorted.indexOf(pick);
            if (idx >= 0) {
                this.difficultyLevel = idx + 1;
                // Highlight the pip it landed on
                this.els['diff-pips'].querySelectorAll('.diff-pip').forEach(pip => {
                    pip.classList.toggle('active', parseInt(pip.dataset.level) === idx + 1);
                });
            }
            this.renderPeekCards();
        }, 600);
    },

    // ---- Add Clue ----
    addClue() {
        let newStep;
        if (this.hasPool) {
            // Pick an unused pool entry, preferring underrepresented rings
            const usedClues = new Set(this.hunt.steps.map(s => s.clue));
            const unused = this.hunt.cluePool.filter(c => !usedClues.has(c.clue));
            if (unused.length > 0) {
                // Count ring usage
                const ringCounts = {};
                this.hunt.steps.forEach(s => { ringCounts[s.ring] = (ringCounts[s.ring] || 0) + 1; });
                // Sort unused by ring frequency (least used first)
                unused.sort((a, b) => (ringCounts[a.ring] || 0) - (ringCounts[b.ring] || 0));
                const pick = unused[0];
                newStep = { ...pick, stepNumber: this.hunt.steps.length + 1, isAdded: true };
            } else {
                // All pool entries used — pick random
                const pick = this.hunt.cluePool[Math.floor(Math.random() * this.hunt.cluePool.length)];
                newStep = { ...pick, stepNumber: this.hunt.steps.length + 1, isAdded: true };
            }
        } else {
            newStep = {
                stepNumber: this.hunt.steps.length + 1,
                ring: this.hunt.steps[this.currentStep]?.ring || 1,
                clue: '',
                answer: '',
                answerVariants: [],
                historicalFact: '',
                isAdded: true
            };
        }

        this.hunt.steps.push(newStep);
        this.currentStep = this.hunt.steps.length - 1;

        // Cost tracking
        this.addedCluesCount++;
        this.updateCostBar();

        this.renderClue();
        if (!this.hasPool || !newStep.clue) {
            this.toggleEdit();
        }
    },

    // ---- Cost Tracking ----
    updateCostBar() {
        if (!this.isPreview || this.addedCluesCount === 0) {
            this.els['cost-bar'].hidden = true;
            return;
        }
        this.els['cost-bar'].hidden = false;
        const count = this.addedCluesCount;
        const cost = this.promoApplied ? 0 : count;
        this.addedCluesCost = cost;
        this.els['cost-bar-count'].textContent = `${count} clue${count !== 1 ? 's' : ''} added`;
        this.els['cost-bar-total'].textContent = cost === 0 ? 'Free' : `$${cost}`;
        this.els['cost-bar-total'].classList.toggle('free', cost === 0);
    },

    applyPromo() {
        const code = this.els['cost-promo'].value.trim().toLowerCase();
        if (code === 'prescientminds') {
            this.promoApplied = true;
            this.els['cost-promo'].value = '';
            this.els['cost-promo'].placeholder = 'Applied!';
            this.updateCostBar();
        }
    },

    // ---- Visual Interventions ----
    renderIntervention() {
        const el = this.els['visual-intervention'];
        if (!el || !this.isPreview) { if (el) el.innerHTML = ''; return; }
        const idx = ((this.hunt.huntId || '').charCodeAt(0) + this.currentStep) % 6;
        const svgs = [
            '<svg viewBox="0 0 60 60"><g stroke="currentColor" fill="none" stroke-width="0.8"><rect x="5" y="5" width="12" height="12"/><rect x="17" y="5" width="12" height="12"/><rect x="29" y="5" width="12" height="12"/><rect x="5" y="17" width="12" height="12"/><rect x="17" y="17" width="12" height="12" fill="currentColor" fill-opacity="0.4"/><rect x="29" y="17" width="12" height="12"/><rect x="5" y="29" width="12" height="12"/><rect x="17" y="29" width="12" height="12"/><rect x="29" y="29" width="12" height="12" fill="currentColor" fill-opacity="0.4"/></g></svg>',
            '<svg viewBox="0 0 60 60"><g stroke="currentColor" fill="none" stroke-width="0.8"><circle cx="30" cy="30" r="24"/><circle cx="30" cy="30" r="2" fill="currentColor"/><line x1="30" y1="6" x2="30" y2="54"/><line x1="6" y1="30" x2="54" y2="30"/><polygon points="30,8 33,22 30,18 27,22" fill="currentColor" stroke="none"/></g></svg>',
            '<svg viewBox="0 0 60 60"><g stroke="currentColor" fill="none" stroke-width="0.8"><rect x="5" y="5" width="50" height="50"/><path d="M5 17h26v14H17v12h26V17"/><path d="M43 5v26H31"/><path d="M5 43h12V31"/></g></svg>',
            '<svg viewBox="0 0 60 60"><g fill="currentColor"><circle cx="10" cy="15" r="2"/><circle cx="45" cy="10" r="2"/><circle cx="30" cy="30" r="2.5"/><circle cx="12" cy="48" r="2"/><circle cx="50" cy="45" r="2"/><line x1="10" y1="15" x2="30" y2="30" stroke="currentColor" stroke-width="0.5" fill="none"/><line x1="45" y1="10" x2="30" y2="30" stroke="currentColor" stroke-width="0.5" fill="none"/><line x1="12" y1="48" x2="30" y2="30" stroke="currentColor" stroke-width="0.5" fill="none"/><line x1="50" y1="45" x2="30" y2="30" stroke="currentColor" stroke-width="0.5" fill="none"/><line x1="12" y1="48" x2="50" y2="45" stroke="currentColor" stroke-width="0.5" fill="none"/></g></svg>',
            '<svg viewBox="0 0 60 60"><g fill="none" stroke="currentColor" stroke-width="0.8"><path d="M30 30c0-3 3-6 6-6s6 3 6 6-3 12-12 12-18-6-18-18 9-24 24-24"/></g></svg>',
            '<svg viewBox="0 0 60 60"><g stroke="currentColor" fill="none" stroke-width="0.8"><line x1="5" y1="10" x2="55" y2="10"/><line x1="12" y1="20" x2="48" y2="20"/><line x1="18" y1="30" x2="42" y2="30"/><line x1="23" y1="40" x2="37" y2="40"/><line x1="27" y1="50" x2="33" y2="50"/><line x1="5" y1="10" x2="27" y2="50"/><line x1="55" y1="10" x2="33" y2="50"/></g></svg>'
        ];
        el.innerHTML = svgs[idx];
    },

    // ---- Peek Cards (carousel preview) ----
    renderPeekCards() {
        const prevEl = this.els['peek-prev'];
        const nextEl = this.els['peek-next'];
        if (!prevEl || !nextEl) return;

        // Previous peek card
        if (this.currentStep > 0) {
            const prevStep = this.hunt.steps[this.currentStep - 1];
            const cluePreview = (prevStep.clue || '').slice(0, 80) + (prevStep.clue.length > 80 ? '...' : '');
            prevEl.innerHTML = `<div class="peek-step">Clue ${prevStep.stepNumber}</div><div class="peek-text">${cluePreview}</div>`;
            prevEl.hidden = false;
        } else {
            prevEl.hidden = true;
        }

        // Next peek card
        const isLast = this.currentStep === this.hunt.steps.length - 1;
        if (!isLast) {
            const nextStep = this.hunt.steps[this.currentStep + 1];
            const cluePreview = (nextStep.clue || '').slice(0, 80) + (nextStep.clue.length > 80 ? '...' : '');
            nextEl.innerHTML = `<div class="peek-step">Clue ${nextStep.stepNumber}</div><div class="peek-text">${cluePreview}</div>`;
            nextEl.hidden = false;
        } else if (isLast && this.currentStep >= 2) {
            // After 3+ cards: show Add Clue as next peek
            nextEl.innerHTML = `<div class="peek-step">Add Clue</div><div class="peek-text peek-add">+ $1</div>`;
            nextEl.hidden = false;
        } else {
            nextEl.hidden = true;
        }
    },

    // ---- I'm Stuck: Call Center Comedy ----
    cancelStuckCall() {
        if (this.stuckTimers) {
            this.stuckTimers.forEach(id => clearTimeout(id));
            this.stuckTimers = [];
        }
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    },

    triggerStuckCall() {
        const step = this.hunt.steps[this.currentStep];
        const answer = step.answer || 'the answer';
        const playerName = this.recipientName || 'friend';
        const stuckText = this.els['stuck-btn'].querySelector('.stuck-text');
        if (stuckText) stuckText.textContent = 'Calling...';
        this.els['stuck-btn'].disabled = true;
        this.stuckTimers = [];

        const lines = [
            { text: `Thank you for calling Happy Hunting Support. My name is Gerald. How can I help you today, ${playerName}?`, rate: 1.0, pitch: 1.05, pause: 2500 },
            { text: `Okay ${playerName}, so you are stuck on a clue. No worries at all. Let me pull up the system here.`, rate: 1.0, pitch: 1.0, pause: 2200 },
            { text: `One moment please. The system is loading.`, rate: 0.95, pitch: 1.0, pause: 2500 },
            { text: `Oh no. Okay the system is not loading. This happens sometimes. Let me try again.`, rate: 1.1, pitch: 1.15, pause: 2200 },
            { text: `Loading. Still loading.`, rate: 0.85, pitch: 0.95, pause: 2500 },
            { text: `I am so sorry ${playerName}. My internet is very slow today. My supervisor is watching me right now. Please do not hang up.`, rate: 1.15, pitch: 1.2, pause: 3000 },
            { text: `Okay! Okay I think it is working now. Let me read the clue. Yes. Yes I see.`, rate: 1.05, pitch: 1.1, pause: 2500 },
            { text: `Hmm. This is a hard one. I am not sure I can...`, rate: 0.9, pitch: 0.9, pause: 2000 },
            { text: `Wait. Wait wait wait. I think I have it. What if the answer is... ${answer}?`, rate: 1.05, pitch: 1.15, pause: 2200 },
            { text: `Yes! I believe the answer is ${answer}. Try that, ${playerName}!`, rate: 1.1, pitch: 1.2, pause: 1000 },
        ];

        if (!('speechSynthesis' in window)) {
            this.els['answer-feedback'].textContent = `The answer is: ${answer}`;
            this.els['answer-feedback'].className = 'answer-feedback correct';
            if (stuckText) stuckText.textContent = "I'm stuck";
            this.els['stuck-btn'].disabled = false;
            return;
        }

        window.speechSynthesis.cancel();
        const voices = window.speechSynthesis.getVoices();
        // Prefer natural-sounding male English voices, fall back to any English
        const preferred = voices.find(v =>
            v.name.includes('Daniel') || v.name.includes('Aaron') ||
            v.name.includes('Rishi') || v.name.includes('Arthur')
        ) || voices.find(v =>
            v.name.includes('Samantha') || v.name.includes('Moira') ||
            (v.lang.startsWith('en') && v.localService)
        );
        let delay = 500;

        lines.forEach(line => {
            this.stuckTimers.push(setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(line.text);
                utterance.rate = line.rate || 1.0;
                utterance.pitch = line.pitch || 1.0;
                utterance.volume = 1.0;
                if (preferred) utterance.voice = preferred;
                window.speechSynthesis.speak(utterance);
            }, delay));
            delay += line.pause;
        });

        this.stuckTimers.push(setTimeout(() => {
            this.els['answer-input'].value = answer;
            if (stuckText) stuckText.textContent = "I'm stuck";
            this.els['stuck-btn'].disabled = false;
            this.checkAnswer();
        }, delay + 1000));
    },

    // ---- Navigation ----
    nextClue() {
        if (this.currentStep === this.hunt.steps.length - 1) {
            this.showArrival();
        } else {
            this.currentStep++;
            this.difficultyLevel = 1;
            this.renderClue();
        }
    },

    prevClue() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.renderClue();
        }
    },

    previewNext() {
        if (this.currentStep < this.hunt.steps.length - 1) {
            this.currentStep++;
            this.renderClue();
        } else {
            this.showArrival();
        }
    },

    showArrival() {
        const bar = this.hunt.bar;
        this.els['arrival-bar'].textContent = bar.name;
        this.els['arrival-address'].textContent = bar.address;
        this.els['arrival-hh'].textContent = bar.happyHour || '';
        this.els['arrival-vibe'].textContent = bar.vibe || '';
        this.els['arrival-arc'].textContent = this.hunt.narrativeArc || '';
        if (!bar.happyHour && !bar.vibe) {
            this.els['arrival-details'].style.display = 'none';
        }
        this.showScreen('arrival');
    },

    // ---- Events ----
    bindEvents() {
        // Begin (interactive mode)
        this.els['begin-btn'].addEventListener('click', () => {
            this.currentStep = 0;
            this.renderClue();
        });

        // Intro forward arrow (preview mode)
        this.els['intro-next'].addEventListener('click', () => {
            this.currentStep = 0;
            this.renderClue();
        });

        // Skin selector
        document.querySelectorAll('.skin-btn').forEach(btn => {
            btn.addEventListener('click', () => this.applySkin(btn.dataset.skin));
        });

        // Submit answer
        this.els['submit-btn'].addEventListener('click', () => this.checkAnswer());
        this.els['answer-input'].addEventListener('keydown', e => {
            if (e.key === 'Enter') this.checkAnswer();
        });

        // Photo done
        this.els['photo-done-btn'].addEventListener('click', () => this.solvePhoto());

        // Difficulty controls — +/- buttons + pip clicks
        this.els['diff-plus'].addEventListener('click', () => this.setDifficulty(this.difficultyLevel + 1));
        this.els['diff-minus'].addEventListener('click', () => this.setDifficulty(this.difficultyLevel - 1));
        this.els['diff-pips'].addEventListener('click', e => {
            const pip = e.target.closest('.diff-pip');
            if (pip) this.setDifficulty(parseInt(pip.dataset.level));
        });

        // Next Clue button (preview mode — locks + advances or adds clue)
        this.els['clue-next-btn'].addEventListener('click', () => {
            this.lockClue();
            const action = this.els['clue-next-btn'].dataset.action;
            if (action === 'add') {
                this.addClue();
            } else if (action === 'done') {
                this.showArrival();
            } else {
                this.previewNext();
            }
        });

        // Cost bar promo
        this.els['cost-promo-apply'].addEventListener('click', () => this.applyPromo());
        this.els['cost-promo'].addEventListener('keydown', e => {
            if (e.key === 'Enter') this.applyPromo();
        });

        // Next clue
        this.els['next-btn'].addEventListener('click', () => this.nextClue());

        // Preview arrows
        this.els['preview-prev'].addEventListener('click', () => this.prevClue());
        this.els['preview-next'].addEventListener('click', () => this.previewNext());

        // Code digit inputs
        const digits = document.querySelectorAll('.code-digit');
        digits.forEach((input, i) => {
            input.addEventListener('input', () => {
                input.value = input.value.replace(/\D/g, '');
                if (input.value && i < digits.length - 1) {
                    digits[i + 1].focus();
                }
                if (i === digits.length - 1 && input.value) {
                    const code = Array.from(digits).map(d => d.value).join('');
                    if (code.length === 4) this.verifyCode(code);
                }
            });
            input.addEventListener('keydown', e => {
                if (e.key === 'Backspace' && !input.value && i > 0) {
                    digits[i - 1].focus();
                }
            });
            input.addEventListener('focus', () => input.select());
        });

        // See Answer toggle (preview mode)
        this.els['see-answer-btn'].addEventListener('click', () => this.toggleAnswer());

        // Edit/Save clue (preview mode)
        this.els['clue-edit-btn'].addEventListener('click', () => this.toggleEdit());
        this.els['clue-save-btn'].addEventListener('click', () => this.saveClue());

        // Dice roll (preview mode)
        this.els['dice-roll-btn'].addEventListener('click', () => this.rollDice());

        // Peek card clicks (preview mode)
        this.els['peek-prev'].addEventListener('click', () => this.prevClue());
        this.els['peek-next'].addEventListener('click', () => {
            const isLast = this.currentStep === this.hunt.steps.length - 1;
            if (isLast && this.currentStep >= 2) {
                this.addClue();
            } else {
                this.previewNext();
            }
        });

        // Preview Start button
        this.els['preview-start-btn'].addEventListener('click', () => {
            this.currentStep = 0;
            this.renderClue();
        });

        // I'm stuck (interactive mode)
        this.els['stuck-btn'].addEventListener('click', () => this.triggerStuckCall());

        // Keyboard arrows for preview mode
        document.addEventListener('keydown', e => {
            if (!this.isPreview) return;
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
            if (e.key === 'ArrowLeft') this.prevClue();
            if (e.key === 'ArrowRight') this.previewNext();
        });
    }
};

document.addEventListener('DOMContentLoaded', () => HappyHunting.init());

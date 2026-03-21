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
    stepDifficulties: {},
    cardDirty: {},
    els: {},
    screens: {},
    isEditing: false,
    editedClues: {},
    lockedClues: {},
    addedCluesCount: 0,
    addedCluesCost: 0,
    promoApplied: false,
    huntPhotos: [],

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
            'difficulty-selector', 'diff-pips', 'diff-slider',
            'intro-next', 'intro-brand-graphic', 'amor-fati-row',
            'answer-row-text',
            'start-location', 'start-transit', 'start-distance', 'start-checkin-btn',
            'start-geo', 'start-photo', 'start-photo-input', 'start-photo-btn',
            'start-photo-preview', 'start-photo-thumb', 'start-begin-btn',
            'memento-btn',
            'arrival-gallery', 'arrival-gallery-grid',
            'preview-prev', 'preview-next',
            'stuck-btn', 'hunt-back',
            'visual-intervention', 'clue-edit-field',
            'dice-roll-btn',
            'pa-prev', 'pa-delete', 'pa-edit', 'pa-action', 'pa-add', 'pa-send-hunt', 'preview-actions',
            'send-back-editor', 'send-accounting', 'send-line-items', 'send-total-amount', 'checkout-container',
            'send-hunt-title', 'send-hunt-form', 'send-your-name', 'send-their-name', 'send-their-phone',
            'send-promo', 'send-promo-apply', 'send-promo-feedback',
            'send-generate-btn', 'send-hunt-result', 'send-hunt-link', 'send-hunt-copy',
            'peek-prev', 'peek-next',
            'route-map',
            'preview-start-btn', 'preview-carousel',
        ].forEach(id => {
            this.els[id] = document.getElementById(id);
        });
        this.screens = {
            envelope: document.getElementById('envelope-screen'),
            intro: document.getElementById('intro-screen'),
            start: document.getElementById('start-screen'),
            clue: document.getElementById('clue-screen'),
            arrival: document.getElementById('arrival-screen'),
            send: document.getElementById('send-screen'),
            error: document.getElementById('error-screen')
        };
    },

    async init() {
        this.cacheElements();
        this.addedCluesCount = 0;
        try { this.stripe = Stripe('pk_test_51TC8t70Eer3QhVmnKLNJO1eonxk6zJ3UG8wFduhb3V3c4BxVDx2ztCBWLPr9UZQT3o69RQRAZpOFN7e2ifpyKzw100wSZ7xmOT'); } catch (e) { console.warn('Stripe.js not loaded'); }

        const params = new URLSearchParams(window.location.search);
        this.skin = params.get('skin') || '';
        this.senderName = params.get('from') || '';
        this.recipientName = params.get('to') || '';
        this.urlKey = params.get('key') || '';
        this.isInvite = !!(this.senderName && this.urlKey);

        // Preview mode: no skin, or explicit preview param
        this.isPreview = (!this.skin || this.skin === 'free' || params.get('preview') === '1') && !this.isInvite;

        if (this.isPreview) {
            // Default to ransom skin in preview — show the hunt styled, not plain
            if (!this.skin || this.skin === 'free') this.skin = 'ransom';
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

        this.bindEvents();

        // Check if returning from Stripe payment
        const sessionId = params.get('session_id');
        if (sessionId) {
            await this.handlePaymentReturn(sessionId);
            return;
        }

        if (this.isInvite) {
            this.renderEnvelope();
        } else {
            this.renderIntro();
        }
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
        this.stepDifficulties[this.currentStep] = level;

        // Update slider value
        if (this.els['diff-slider']) this.els['diff-slider'].value = level;

        if (!this.hasPool || sorted.length === 0) return;

        let pick = sorted.find(c => c.difficulty === level) || sorted[level - 1];

        const current = this.hunt.steps[this.currentStep];
        if (pick.clue !== current.clue || current.isBlank) {
            this.hunt.steps[this.currentStep] = {
                ...pick,
                stepNumber: this.currentStep + 1,
                isAdded: current.isAdded,
                isBlank: false
            };
            this.renderClueContent();
            this.cardDirty[this.currentStep] = true;
            this.actionShowNext = false;
            this.updatePreviewActions();
        }
    },

    renderDifficultyPips() {
        const slider = this.els['diff-slider'];
        if (!slider) return;
        const candidates = this.getPoolForCurrentRing();
        const count = candidates.length || 1;
        const currentDiff = this.stepDifficulties[this.currentStep] || 1;
        slider.min = 1;
        slider.max = count;
        slider.value = currentDiff;
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
            if (this.isPreview) {
                meta.innerHTML = `${count} clues. One destination.<br>Preview.`;
            } else if (this.hunt.startLocation) {
                meta.innerHTML = `${count} clues. One destination.<br>Head to ${this.hunt.startLocation.label}.`;
            } else {
                meta.innerHTML = `${count} clues. One destination.<br>Start walking.`;
            }
        }
        if (this.isPreview) {
            // Preview: show skin selector + Start button + forward arrow
            this.els['skin-selector'].style.display = '';
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
            // Preview mode: hide interactive answer, show preview actions
            this.els['answer-section'].hidden = true;
            this.els['fact-reveal'].classList.remove('visible');

            // Navigation arrows (carousel)
            this.els['preview-prev'].hidden = this.currentStep === 0;
            const isLast = this.currentStep === this.hunt.steps.length - 1;
            this.els['preview-next'].hidden = isLast && !(isLast && this.currentStep >= 2);

            // Reset edit state when navigating to a card
            this.isEditing = false;
            this.actionShowNext = false;
            this.els['clue-text'].hidden = false;
            this.els['clue-edit-field'].hidden = true;

            // Update button states
            this.updatePreviewActions();

            // Peek cards + route map
            this.renderPeekCards();
            this.renderIntervention();
            this.renderRouteMap();
        } else {
            // Interactive mode: show answers, hide preview elements
            this.els['answer-section'].hidden = false;
            this.els['preview-actions'].hidden = true;
            this.els['preview-prev'].hidden = true;
            this.els['preview-next'].hidden = true;
            this.els['amor-fati-row'].hidden = true;
            this.els['peek-prev'].hidden = true;
            this.els['peek-next'].hidden = true;
            this.els['visual-intervention'].innerHTML = '';
            this.renderRouteMap();

            // All clues are text answers
            this.els['answer-row-text'].hidden = false;

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

            setTimeout(() => this.els['answer-input'].focus(), 500);
        }

        this.showScreen('clue');
    },

    renderClueContent() {
        const step = this.hunt.steps[this.currentStep];
        if (step.isBlank) {
            this.els['clue-text'].innerHTML = '<span class="blank-clue-hint">Select a difficulty to see this clue</span>';
            return;
        }
        this.renderClueText(step.clue);
    },

    renderClueText(text) {
        if (this.skin === 'ransom') {
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

    // ---- Start Location Screen + Geo Gate + Photo ----
    showStartScreen() {
        const sl = this.hunt.startLocation;
        if (!sl) {
            this.currentStep = 0;
            this.renderClue();
            return;
        }
        this.els['start-location'].textContent = sl.label;
        this.els['start-transit'].textContent = sl.transit || '';
        this.els['start-distance'].textContent = '';
        // Show geo phase, hide photo phase
        this.els['start-geo'].hidden = false;
        this.els['start-photo'].hidden = true;
        this.els['start-photo-preview'].hidden = true;
        // In preview mode, show "Continue" instead of geo check
        this.els['start-checkin-btn'].textContent = this.isPreview ? 'Continue' : "I'm here";
        this.showScreen('start');
    },

    showStartPhotoPhase() {
        this.els['start-geo'].hidden = true;
        this.els['start-photo'].hidden = false;
    },

    handleStartPhoto(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            this.huntPhotos.push({ label: 'start', src: dataUrl });
            this.els['start-photo-thumb'].src = dataUrl;
            this.els['start-photo-preview'].hidden = false;
            // Brief pause to show the photo, then begin
            setTimeout(() => {
                this.currentStep = 0;
                this.renderClue();
            }, 800);
        };
        reader.readAsDataURL(file);
    },

    beginHunt() {
        this.currentStep = 0;
        this.renderClue();
    },

    checkLocation() {
        const sl = this.hunt.startLocation;
        if (!sl) { this.currentStep = 0; this.renderClue(); return; }

        // Preview mode: skip geolocation, show photo phase
        if (this.isPreview) {
            this.showStartPhotoPhase();
            return;
        }

        const btn = this.els['start-checkin-btn'];
        btn.textContent = 'Checking...';
        btn.disabled = true;

        if (!navigator.geolocation) {
            // No geolocation support — show photo phase
            this.showStartPhotoPhase();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const dist = this.haversineDistance(
                    pos.coords.latitude, pos.coords.longitude,
                    sl.lat, sl.lng
                );
                if (dist <= 150) {
                    // Close enough — show photo option
                    this.showStartPhotoPhase();
                } else {
                    const blocks = Math.round(dist / 80); // ~80m per short block in LA
                    this.els['start-distance'].textContent =
                        `You're about ${blocks} block${blocks !== 1 ? 's' : ''} away. Keep going.`;
                    btn.textContent = "I'm here";
                    btn.disabled = false;
                }
            },
            (err) => {
                // Permission denied or error — show photo phase
                this.showStartPhotoPhase();
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    },

    haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // meters
        const toRad = d => d * Math.PI / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

    // ---- Edit Clue ----
    toggleEdit() {
        this.isEditing = true;
        const step = this.hunt.steps[this.currentStep];
        this.els['clue-edit-field'].value = step.clue;
        this.els['clue-text'].hidden = true;
        this.els['clue-edit-field'].hidden = false;
        this.els['clue-edit-field'].focus();
        this.cardDirty[this.currentStep] = true;
        this.updatePreviewActions();
    },

    // ---- Save Current Card (unified — handles edit text + difficulty locks) ----
    saveCurrentCard() {
        if (this.isEditing) {
            const text = this.els['clue-edit-field'].value.trim();
            if (!text) return;
            this.isEditing = false;
            const step = this.hunt.steps[this.currentStep];
            step.clue = text;
            this.editedClues[this.currentStep] = true;
            this.renderClueText(text);
            this.els['clue-text'].hidden = false;
            this.els['clue-edit-field'].hidden = true;
        }
        this.lockClue();
        this.cardDirty[this.currentStep] = false;
        this.updatePreviewActions();
    },

    // ---- Dice Roll: Amor Fati ----
    rollDice() {
        const allCandidates = this.getPoolForCurrentRing();
        const currentClue = this.hunt.steps[this.currentStep].clue;
        // Exclude the current clue so it always changes
        const candidates = allCandidates.filter(c => c.clue !== currentClue);
        if (candidates.length === 0) return;
        const wasAdded = this.hunt.steps[this.currentStep].isAdded;
        const btn = this.els['dice-roll-btn'];
        btn.classList.add('dice-rolling');
        setTimeout(() => {
            btn.classList.remove('dice-rolling');
            const pick = candidates[Math.floor(Math.random() * candidates.length)];
            this.hunt.steps[this.currentStep] = {
                ...pick,
                stepNumber: this.currentStep + 1,
                isAdded: wasAdded,
                isBlank: false
            };
            this.renderClueContent();
            const sorted = allCandidates.slice().sort((a, b) => (a.difficulty || 0) - (b.difficulty || 0));
            const idx = sorted.indexOf(pick);
            if (idx >= 0) {
                this.stepDifficulties[this.currentStep] = idx + 1;
                if (this.els['diff-slider']) this.els['diff-slider'].value = idx + 1;
            }
            this.cardDirty[this.currentStep] = true;
            this.actionShowNext = false;
            this.updatePreviewActions();
            this.renderPeekCards();
        }, 600);
    },

    // ---- Delete Clue (user-added only) ----
    deleteClue() {
        if (this.hunt.steps.length <= 3) return; // keep at least 3 clues
        const step = this.hunt.steps[this.currentStep];

        this.hunt.steps.splice(this.currentStep, 1);
        // Renumber remaining steps
        this.hunt.steps.forEach((s, i) => { s.stepNumber = i + 1; });

        // Clean up state for removed card
        delete this.stepDifficulties[this.currentStep];
        delete this.cardDirty[this.currentStep];


        // Navigate: go to previous card (or stay on last)
        if (this.currentStep > 0) this.currentStep--;
        this.renderClue();
    },

    // ---- Add Clue ----
    addClue() {
        let newStep;
        if (this.hasPool) {
            // Determine which ring to use for the new clue
            const ringCounts = {};
            this.hunt.steps.forEach(s => { ringCounts[s.ring] = (ringCounts[s.ring] || 0) + 1; });
            const usedClues = new Set(this.hunt.steps.map(s => s.clue));
            const unused = this.hunt.cluePool.filter(c => !usedClues.has(c.clue));
            // Pick ring with least usage
            unused.sort((a, b) => (ringCounts[a.ring] || 0) - (ringCounts[b.ring] || 0));
            const targetRing = unused.length > 0 ? unused[0].ring : 1;

            // Prepopulate with an actual clue from the pool
            const ringUnused = unused.filter(c => c.ring === targetRing);
            const pick = ringUnused.length > 0
                ? ringUnused[Math.floor(Math.random() * ringUnused.length)]
                : (unused.length > 0 ? unused[0] : null);

            if (pick) {
                newStep = {
                    ...pick,
                    stepNumber: this.hunt.steps.length + 1,
                    isAdded: true
                };
            } else {
                // Fallback: all pool clues used, create blank
                newStep = {
                    stepNumber: this.hunt.steps.length + 1,
                    ring: targetRing,
                    clue: '',
                    answer: '',
                    answerVariants: [],
                    answerType: 'text',
                    historicalFact: '',
                    isAdded: true,
                    isBlank: true
                };
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
        this.stepDifficulties[this.currentStep] = 0;
        this.cardDirty[this.currentStep] = true;

        this.renderClue();
        if (!this.hasPool) {
            this.toggleEdit();
        }
    },


    // ---- Preview Actions ----
    updatePreviewActions() {
        if (!this.isPreview) return;
        const actions = this.els['preview-actions'];
        if (!actions) return;
        actions.hidden = false;

        const isLast = this.currentStep === this.hunt.steps.length - 1;
        const actionBtn = this.els['pa-action'];

        // Previous: hidden on card 1
        this.els['pa-prev'].hidden = this.currentStep === 0;

        // Delete: only when > 3 clues
        this.els['pa-delete'].hidden = this.hunt.steps.length <= 3;

        // Edit: always visible
        this.els['pa-edit'].hidden = false;

        // Action button (Save / Next Clue):
        // - Default: "Save"
        // - After saving on non-last card: "Next Clue"
        // - After saving on last card: hidden (Add Clue + Send Invite take over)
        if (this.actionShowNext && isLast) {
            actionBtn.hidden = true;
        } else if (this.actionShowNext) {
            actionBtn.hidden = false;
            actionBtn.textContent = 'Next Clue';
            actionBtn.className = 'pa-btn pa-primary';
        } else {
            actionBtn.hidden = false;
            actionBtn.textContent = 'Save';
            actionBtn.className = 'pa-btn pa-save';
        }

        // Add Clue + Send Invite: last card only, after saving
        const showRight = isLast && this.actionShowNext;
        this.els['pa-add'].hidden = !showRight;
        this.els['pa-send-hunt'].hidden = !showRight;
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

    // ---- Route Map ----
    renderRouteMap() {
        const el = this.els['route-map'];
        if (!el) return;
        const rm = this.hunt.routeMap;
        if (!rm) { el.innerHTML = ''; return; }

        const bar = this.hunt.bar;
        const barLat = this.hunt.startLocation?.lat || rm.stops[rm.stops.length - 1].lat;
        const barLng = this.hunt.startLocation?.lng || rm.stops[rm.stops.length - 1].lng;

        // Collect all points for bounds
        const pts = [
            ...rm.stops.map(s => [s.lat, s.lng]),
            ...rm.streets.flatMap(st => [st.from, st.to])
        ];
        const lats = pts.map(p => p[0]);
        const lngs = pts.map(p => p[1]);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        const W = 300, H = 140, PAD = 28;
        // LA latitude: 1° lat ≈ 111km, 1° lng ≈ 93km
        const latScale = 111000;
        const lngScale = 93000;
        const meterW = (maxLng - minLng) * lngScale || 100;
        const meterH = (maxLat - minLat) * latScale || 100;
        const scaleX = (W - 2 * PAD) / meterW;
        const scaleY = (H - 2 * PAD) / meterH;
        const scale = Math.min(scaleX, scaleY);
        const oX = PAD + ((W - 2 * PAD) - meterW * scale) / 2;
        const oY = PAD + ((H - 2 * PAD) - meterH * scale) / 2;

        const toX = lng => oX + (lng - minLng) * lngScale * scale;
        const toY = lat => oY + (maxLat - lat) * latScale * scale;

        // Deterministic wobble
        const wobble = (seed, amp) => {
            const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
            return ((x - Math.floor(x)) - 0.5) * amp;
        };

        let svg = `<svg viewBox="0 0 ${W} ${H}" class="route-map-svg" xmlns="http://www.w3.org/2000/svg">`;

        // Streets — hand-drawn lines
        rm.streets.forEach((st, si) => {
            const x1 = toX(st.from[1]), y1 = toY(st.from[0]);
            const x2 = toX(st.to[1]), y2 = toY(st.to[0]);
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
            const dx = x2 - x1, dy = y2 - y1;
            const len = Math.sqrt(dx * dx + dy * dy);
            const nx = -dy / len, ny = dx / len;
            const w = wobble(si * 7 + 3, len * 0.04);
            const cx = mx + nx * w, cy = my + ny * w;
            svg += `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" class="rm-street"/>`;
            // Label
            const lx = mx + nx * 6, ly = my + ny * 6;
            let angle = Math.atan2(dy, dx) * 180 / Math.PI;
            if (angle > 90 || angle < -90) angle += 180;
            svg += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" transform="rotate(${angle.toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})" class="rm-label">${st.name}</text>`;
        });

        // Progressive reveal: show stops up to current step in preview
        const visibleCount = this.isPreview ? this.currentStep + 1 : rm.stops.length;
        const visibleStops = rm.stops.slice(0, visibleCount);

        // Route path — dashed, connecting visible stops in order
        if (visibleStops.length > 0) {
            const routePts = visibleStops.map(s => [toX(s.lng), toY(s.lat)]);
            let pathD = `M${routePts[0][0].toFixed(1)},${routePts[0][1].toFixed(1)}`;
            for (let i = 1; i < routePts.length; i++) {
                const px = routePts[i][0], py = routePts[i][1];
                const ppx = routePts[i - 1][0], ppy = routePts[i - 1][1];
                const cmx = (ppx + px) / 2 + wobble(i * 13, 4);
                const cmy = (ppy + py) / 2 + wobble(i * 17, 4);
                pathD += ` Q${cmx.toFixed(1)},${cmy.toFixed(1)} ${px.toFixed(1)},${py.toFixed(1)}`;
            }
            svg += `<path d="${pathD}" class="rm-route"/>`;
        }

        // Stop markers — visible stops only
        visibleStops.forEach((s, i) => {
            const x = toX(s.lng), y = toY(s.lat);
            const active = i === this.currentStep;
            svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${active ? 7 : 5}" class="rm-stop${active ? ' active' : ''}"/>`;
            svg += `<text x="${x.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" class="rm-stop-num">${s.ring}</text>`;
        });

        // Bar marker (destination)
        const bx = toX(barLng), by = toY(barLat);
        if (visibleStops.length > 0) {
            const s1x = toX(visibleStops[0].lng), s1y = toY(visibleStops[0].lat);
            if (Math.abs(bx - s1x) > 8 || Math.abs(by - s1y) > 8) {
                svg += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="4" class="rm-bar"/>`;
            }
        }

        svg += '</svg>';
        el.innerHTML = svg;
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

    // ---- Send Screen ----
    getExtraClueCount() {
        return Math.max(0, this.hunt.steps.length - 3);
    },

    getSendTotal() {
        if (this.sendPromoApplied) return 0;
        return 5 + this.getExtraClueCount();
    },

    renderSendAccounting() {
        const items = this.els['send-line-items'];
        items.innerHTML = '';

        // Premium hunt base price
        const baseLine = document.createElement('div');
        baseLine.className = 'send-line-item';
        baseLine.innerHTML = '<span class="send-item-name">Premium Hunt</span><span class="send-item-price">$5</span>';
        items.appendChild(baseLine);

        // Extra clues — $1 each for clues beyond 3
        const extraCount = this.getExtraClueCount();
        for (let i = 0; i < extraCount; i++) {
            const clueIndex = 3 + i; // clues 4, 5, 6...
            const line = document.createElement('div');
            line.className = 'send-line-item send-line-extra';
            const label = `Extra Clue \u2014 Clue ${clueIndex + 1}`;
            line.innerHTML = `<span class="send-item-name">${label}</span><span class="send-item-price">$1</span><button class="send-remove-clue" data-step="${clueIndex}">&times;</button>`;
            items.appendChild(line);
        }

        // Update total
        const total = this.getSendTotal();
        this.els['send-total-amount'].textContent = total === 0 ? 'Free' : `$${total}`;
        this.els['send-generate-btn'].textContent = total === 0 ? 'Generate Invite \u2014 Free' : `Generate Invite \u2014 $${total}`;
    },

    removeSendClue(stepIndex) {
        if (this.hunt.steps.length <= 3) return;
        if (stepIndex < 3) return; // can't remove the base 3

        this.hunt.steps.splice(stepIndex, 1);
        this.hunt.steps.forEach((s, i) => { s.stepNumber = i + 1; });

        delete this.stepDifficulties[stepIndex];
        delete this.cardDirty[stepIndex];

        // Re-render accounting
        this.renderSendAccounting();
    },

    showSendScreen() {
        this.els['send-hunt-title'].textContent = this.hunt.theme;
        this.els['send-hunt-form'].hidden = false;
        this.els['send-hunt-result'].hidden = true;
        this.els['send-your-name'].value = '';
        this.els['send-their-name'].value = '';
        this.els['send-their-phone'].value = '';
        this.els['send-promo'].value = '';
        this.els['send-promo-feedback'].textContent = '';
        this.sendPromoApplied = false;

        // Render accounting
        this.renderSendAccounting();

        this.showScreen('send');
    },

    checkSendPromo() {
        const code = this.els['send-promo'].value.trim().toLowerCase();
        const fb = this.els['send-promo-feedback'];
        if (code === 'prescientminds') {
            this.sendPromoApplied = true;
            fb.textContent = 'Applied \u2014 invitation is free';
            fb.className = 'send-promo-feedback valid';
        } else if (code.length > 0) {
            this.sendPromoApplied = false;
            fb.textContent = 'Invalid code';
            fb.className = 'send-promo-feedback invalid';
        } else {
            this.sendPromoApplied = false;
            fb.textContent = '';
            fb.className = 'send-promo-feedback';
        }
        this.renderSendAccounting();
    },

    async generateSendLink() {
        const senderName = this.els['send-your-name'].value.trim();
        const recipientName = this.els['send-their-name'].value.trim();
        const phone = this.els['send-their-phone'].value.replace(/\D/g, '');

        if (!senderName) { this.els['send-your-name'].focus(); return; }
        if (!recipientName) { this.els['send-their-name'].focus(); return; }
        if (phone.length < 4) { this.els['send-their-phone'].focus(); return; }

        const total = this.getSendTotal();
        if (total === 0) {
            // Free via promo — skip payment
            this.createInviteLink(senderName, recipientName, phone);
            return;
        }

        // Save state for after payment return
        localStorage.setItem('hh_payment', JSON.stringify({
            senderName, recipientName, phone,
            huntId: this.hunt.huntId,
            skin: this.skin,
            ts: Date.now()
        }));

        // Start Stripe Embedded Checkout
        const btn = this.els['send-generate-btn'];
        const extraClues = this.getExtraClueCount();
        btn.textContent = 'Loading\u2026';
        btn.disabled = true;

        try {
            // Build return URL preserving current hunt params + session_id template
            const retUrl = new URL(window.location.href.replace(/hunt\.html.*$/, 'hunt.html'));
            retUrl.search = '';
            retUrl.searchParams.set('h', btoa(this.hunt.huntId).replace(/=/g, ''));
            retUrl.searchParams.set('skin', this.skin);
            retUrl.searchParams.set('preview', '1');
            const returnUrl = retUrl.toString() + '&session_id={CHECKOUT_SESSION_ID}';

            const res = await fetch('/api/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addedClues: extraClues, returnUrl })
            });

            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            // Hide form, show checkout
            this.els['send-hunt-form'].hidden = true;
            this.els['send-accounting'].hidden = true;
            this.els['send-back-editor'].hidden = true;
            this.els['checkout-container'].hidden = false;

            const checkout = await this.stripe.initEmbeddedCheckout({ clientSecret: data.clientSecret });
            checkout.mount('#checkout-container');
        } catch (err) {
            console.error('Checkout error:', err);
            btn.textContent = `Generate Invite \u2014 $${total}`;
            btn.disabled = false;
            // Show error to user
            const fb = this.els['send-promo-feedback'];
            fb.textContent = 'Payment error: ' + err.message;
            fb.className = 'send-promo-feedback invalid';
        }
    },

    createInviteLink(senderName, recipientName, phone) {
        const last4 = phone.replace(/\D/g, '').slice(-4);
        const key = btoa(last4 + ':' + this.hunt.huntId).replace(/=/g, '');

        const base = window.location.href.replace(/hunt\.html.*$/, 'hunt.html');
        const url = new URL(base);
        url.search = '';
        url.searchParams.set('h', btoa(this.hunt.huntId).replace(/=/g, ''));
        url.searchParams.set('skin', this.skin);
        url.searchParams.set('from', senderName);
        url.searchParams.set('to', recipientName);
        url.searchParams.set('key', key);

        this.els['send-hunt-form'].hidden = true;
        this.els['send-accounting'].hidden = true;
        this.els['checkout-container'].hidden = true;
        this.els['send-back-editor'].hidden = true;
        this.els['send-hunt-result'].hidden = false;
        this.els['send-hunt-link'].value = url.toString();
    },

    async handlePaymentReturn(sessionId) {
        // Verify payment with Stripe
        try {
            const res = await fetch(`/api/session-status?session_id=${encodeURIComponent(sessionId)}`);
            const data = await res.json();

            if (data.status === 'complete' && data.payment_status === 'paid') {
                // Restore saved state
                const saved = JSON.parse(localStorage.getItem('hh_payment') || 'null');
                localStorage.removeItem('hh_payment');

                if (saved && Date.now() - saved.ts < 3600000) {
                    this.createInviteLink(saved.senderName, saved.recipientName, saved.phone);
                    this.showScreen('send');
                } else {
                    // State expired or missing — show success without link
                    this.els['send-hunt-title'].textContent = this.hunt.theme;
                    this.els['send-hunt-form'].hidden = true;
                    this.els['send-accounting'].hidden = true;
                    this.els['send-back-editor'].hidden = true;
                    this.els['send-hunt-result'].hidden = false;
                    this.els['send-hunt-link'].value = 'Payment confirmed. Refresh to generate link.';
                    this.showScreen('send');
                }
            } else {
                // Payment not complete — go to intro
                this.renderIntro();
            }
        } catch (err) {
            console.error('Payment verification error:', err);
            this.renderIntro();
        }

        // Clean session_id from URL
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('session_id');
        window.history.replaceState({}, '', cleanUrl.toString());
    },

    async copySendLink() {
        const input = this.els['send-hunt-link'];
        const btn = this.els['send-hunt-copy'];
        let copied = false;
        if (navigator.clipboard && window.isSecureContext) {
            try { await navigator.clipboard.writeText(input.value); copied = true; } catch (e) { /* fall through */ }
        }
        if (!copied) {
            input.focus();
            input.select();
            input.setSelectionRange(0, 99999);
            try { copied = document.execCommand('copy'); } catch (e) { /* noop */ }
        }
        if (copied) {
            const orig = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = orig; }, 2000);
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

        // Photo gallery
        if (this.huntPhotos.length > 0) {
            const grid = this.els['arrival-gallery-grid'];
            grid.innerHTML = '';
            this.huntPhotos.forEach(p => {
                const img = document.createElement('img');
                img.src = p.src;
                img.alt = `Hunt photo`;
                img.className = 'arrival-photo';
                grid.appendChild(img);
            });
            this.els['arrival-gallery'].hidden = false;
        }

        this.showScreen('arrival');
    },

    // ---- Events ----
    bindEvents() {
        // Begin → start screen (all modes) or clue 1
        this.els['begin-btn'].addEventListener('click', () => {
            if (this.hunt.startLocation) {
                this.showStartScreen();
            } else {
                this.currentStep = 0;
                this.renderClue();
            }
        });

        // Intro forward arrow (preview mode) → also through start screen
        this.els['intro-next'].addEventListener('click', () => {
            if (this.hunt.startLocation) {
                this.showStartScreen();
            } else {
                this.currentStep = 0;
                this.renderClue();
            }
        });

        // Start screen check-in
        this.els['start-checkin-btn'].addEventListener('click', () => {
            this.checkLocation();
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

        // Start screen: photo + begin
        this.els['start-photo-btn'].addEventListener('click', () => {
            this.els['start-photo-input'].click();
        });
        this.els['start-photo-input'].addEventListener('change', (e) => {
            this.handleStartPhoto(e.target.files[0]);
            e.target.value = '';
        });
        this.els['start-begin-btn'].addEventListener('click', () => this.beginHunt());

        // Memento button (arrival screen)
        this.els['memento-btn'].addEventListener('click', () => {
            // For now, share via native share or download
            if (navigator.share && this.huntPhotos.length > 0) {
                navigator.share({ title: 'Happy Hunting Memento', text: `Our hunt to ${this.hunt.bar.name}` }).catch(() => {});
            }
        });

        // Difficulty slider
        this.els['diff-slider'].addEventListener('input', () => {
            this.setDifficulty(parseInt(this.els['diff-slider'].value));
        });

        // Preview action buttons
        this.els['pa-prev'].addEventListener('click', () => this.prevClue());
        this.els['pa-delete'].addEventListener('click', () => this.deleteClue());
        this.els['pa-add'].addEventListener('click', () => this.addClue());
        this.els['pa-send-hunt'].addEventListener('click', () => this.showSendScreen());

        // Edit: enters edit mode, resets action button to Save
        this.els['pa-edit'].addEventListener('click', () => {
            this.toggleEdit();
            this.actionShowNext = false;
            this.updatePreviewActions();
        });

        // Action button: Save or Next Clue
        this.els['pa-action'].addEventListener('click', () => {
            if (this.actionShowNext) {
                // Next Clue — advance
                this.lockClue();
                this.previewNext();
            } else {
                // Save — save edits, switch to Next Clue
                this.saveCurrentCard();
                this.actionShowNext = true;
                this.updatePreviewActions();
            }
        });

        // Send screen
        this.els['send-back-editor'].addEventListener('click', () => {
            this.currentStep = this.hunt.steps.length - 1;
            this.renderClue();
        });
        this.els['send-promo-apply'].addEventListener('click', () => this.checkSendPromo());
        this.els['send-generate-btn'].addEventListener('click', () => this.generateSendLink());
        this.els['send-hunt-copy'].addEventListener('click', () => this.copySendLink());
        this.els['send-line-items'].addEventListener('click', e => {
            const btn = e.target.closest('.send-remove-clue');
            if (btn) this.removeSendClue(parseInt(btn.dataset.step));
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

        // Preview Start button → also through start screen
        this.els['preview-start-btn'].addEventListener('click', () => {
            if (this.hunt.startLocation) {
                this.showStartScreen();
            } else {
                this.currentStep = 0;
                this.renderClue();
            }
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

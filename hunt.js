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

    cacheElements() {
        [
            'hunt-theme', 'begin-btn', 'skin-selector',
            'step-label', 'clue-text', 'clue-body',
            'answer-section', 'answer-input', 'submit-btn',
            'answer-feedback', 'fact-reveal', 'fact-text',
            'next-btn', 'arrival-bar', 'arrival-address',
            'arrival-hh', 'arrival-vibe', 'arrival-arc',
            'arrival-details', 'envelope-sender', 'unlock-feedback',
            'envelope', 'code-row', 'difficulty-ctrl',
            'diff-level', 'diff-of', 'diff-minus', 'diff-plus',
            'answer-row-text', 'answer-row-photo', 'photo-done-btn',
            'preview-prev', 'preview-next',
            'stuck-btn', 'see-answer-btn', 'preview-answer-section',
            'preview-answer-text', 'hunt-back'
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
            const huntId = params.get('hunt') || 'thunderbolt';
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
        // Sort by difficulty field if present, fall back to array order
        const sorted = candidates.slice().sort((a, b) => (a.difficulty || 0) - (b.difficulty || 0));
        const max = sorted.length || 1;
        if (level < 1) level = 1;
        if (level > max) level = max;
        this.difficultyLevel = level;
        this.els['diff-level'].textContent = level;
        this.els['diff-of'].textContent = '/ ' + max;

        if (!this.hasPool || sorted.length === 0) return;

        // Pick clue by difficulty field if available, otherwise by index
        let pick = sorted.find(c => c.difficulty === level) || sorted[level - 1];

        if (pick.clue !== this.hunt.steps[this.currentStep].clue) {
            this.hunt.steps[this.currentStep] = { ...pick, stepNumber: this.currentStep + 1 };
            this.renderClueContent();
        }
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
        if (this.isInvite) {
            this.els['skin-selector'].style.display = 'none';
        }
        if (this.isPreview) {
            this.els['skin-selector'].style.display = 'none';
        }
        this.showScreen('intro');
    },

    // ---- Clue Rendering ----
    renderClue() {
        const step = this.hunt.steps[this.currentStep];
        this.els['step-label'].textContent = `Clue ${step.stepNumber} of ${this.hunt.steps.length}`;

        this.renderClueContent();

        // Difficulty ctrl: show for pool hunts (both preview and interactive)
        this.els['difficulty-ctrl'].hidden = !this.hasPool;

        // Update difficulty range for this ring
        if (this.hasPool) {
            const candidates = this.getPoolForCurrentRing();
            this.els['diff-of'].textContent = '/ ' + candidates.length;
        }

        if (this.isPreview) {
            // Preview mode: hide interactive answer, show preview answer + arrows
            this.els['answer-section'].hidden = true;
            this.els['preview-answer-section'].hidden = false;
            this.els['see-answer-btn'].hidden = false;
            this.els['preview-answer-text'].textContent = '';
            this.els['preview-answer-text'].hidden = true;
            this.els['fact-reveal'].classList.remove('visible');
            this.els['preview-prev'].hidden = this.currentStep === 0;
            this.els['preview-next'].hidden = this.currentStep === this.hunt.steps.length - 1;
        } else {
            // Interactive mode: show answers, hide preview elements
            this.els['answer-section'].hidden = false;
            this.els['preview-answer-section'].hidden = true;
            this.els['preview-prev'].hidden = true;
            this.els['preview-next'].hidden = true;

            // Photo vs text answer
            const isPhoto = step.answerType === 'photo';
            this.els['answer-row-text'].hidden = isPhoto;
            this.els['answer-row-photo'].hidden = !isPhoto;

            // "I'm stuck" button: show after a delay, hidden initially
            this.els['stuck-btn'].hidden = true;
            this.stuckTimeout = setTimeout(() => {
                this.els['stuck-btn'].hidden = false;
            }, 15000); // appears after 15 seconds

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
            this.els['clue-text'].innerHTML = this.renderRansomText(text);
        } else {
            this.els['clue-text'].textContent = text;
        }
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

    // ---- Preview: See Answer ----
    revealAnswer() {
        const step = this.hunt.steps[this.currentStep];
        const answer = step.answer || '(no answer set)';
        this.els['see-answer-btn'].hidden = true;
        this.els['preview-answer-text'].textContent = answer;
        this.els['preview-answer-text'].hidden = false;

        // Also show the historical fact
        if (step.historicalFact) {
            this.els['fact-text'].textContent = step.historicalFact;
            this.els['fact-reveal'].classList.add('visible');
        }
    },

    // ---- I'm Stuck: Call Center Comedy ----
    triggerStuckCall() {
        const step = this.hunt.steps[this.currentStep];
        const answer = step.answer || 'the answer';
        this.els['stuck-btn'].textContent = 'Calling...';
        this.els['stuck-btn'].disabled = true;

        // Build the scripted call center bit
        const lines = [
            { text: `Thank you for calling Happy Hunting Support, my name is... uh... my name is Gerald. How can I help you today?`, pause: 2500 },
            { text: `Okay so you are stuck on a clue. Let me pull up the system here.`, pause: 2000 },
            { text: `One moment please... the system is loading...`, pause: 2500 },
            { text: `Oh no. Okay the system is not loading. This happens sometimes. Let me try again.`, pause: 2000 },
            { text: `Loading... still loading...`, pause: 2500 },
            { text: `Sir, ma'am, I am so sorry. My internet is very slow today. My supervisor is watching me right now. Please do not hang up.`, pause: 3000 },
            { text: `Okay! Okay I think it is working now. Let me read the clue... yes... yes I see...`, pause: 2500 },
            { text: `Hmm. This is a hard one. I am not sure I...`, pause: 2000 },
            { text: `Wait. Wait wait wait. I think I have it. What if... what if the answer is... ${answer}?`, pause: 2000 },
            { text: `Yes! I believe the answer is: ${answer}. Try that!`, pause: 1000 },
        ];

        // Use Web Speech API
        if (!('speechSynthesis' in window)) {
            // Fallback: just show the answer
            this.els['answer-feedback'].textContent = `The answer is: ${answer}`;
            this.els['answer-feedback'].className = 'answer-feedback correct';
            this.els['stuck-btn'].textContent = 'I\'m stuck';
            this.els['stuck-btn'].disabled = false;
            return;
        }

        window.speechSynthesis.cancel();
        let delay = 500;

        lines.forEach(line => {
            setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(line.text);
                utterance.rate = 1.05;
                utterance.pitch = 1.1;
                // Try to find a voice that sounds right
                const voices = window.speechSynthesis.getVoices();
                const preferred = voices.find(v =>
                    v.name.includes('Daniel') || v.name.includes('Rishi') ||
                    v.name.includes('Moira') || v.name.includes('Samantha')
                );
                if (preferred) utterance.voice = preferred;
                window.speechSynthesis.speak(utterance);
            }, delay);
            delay += line.pause;
        });

        // After the bit finishes, fill in the answer
        setTimeout(() => {
            this.els['answer-input'].value = answer;
            this.els['stuck-btn'].textContent = 'I\'m stuck';
            this.els['stuck-btn'].disabled = false;
            this.checkAnswer();
        }, delay + 1000);
    },

    // ---- Navigation ----
    nextClue() {
        if (this.stuckTimeout) clearTimeout(this.stuckTimeout);
        if (this.currentStep === this.hunt.steps.length - 1) {
            this.showArrival();
        } else {
            this.currentStep++;
            this.difficultyLevel = 1;
            this.els['diff-level'].textContent = '1';
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
        // Begin
        this.els['begin-btn'].addEventListener('click', () => {
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

        // Difficulty controls
        this.els['diff-plus'].addEventListener('click', () => this.setDifficulty(this.difficultyLevel + 1));
        this.els['diff-minus'].addEventListener('click', () => this.setDifficulty(this.difficultyLevel - 1));

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

        // See Answer (preview mode)
        this.els['see-answer-btn'].addEventListener('click', () => this.revealAnswer());

        // I'm stuck (interactive mode)
        this.els['stuck-btn'].addEventListener('click', () => this.triggerStuckCall());

        // Keyboard arrows for preview mode
        document.addEventListener('keydown', e => {
            if (!this.isPreview) return;
            if (document.activeElement.tagName === 'INPUT') return;
            if (e.key === 'ArrowLeft') this.prevClue();
            if (e.key === 'ArrowRight') this.previewNext();
        });
    }
};

document.addEventListener('DOMContentLoaded', () => HappyHunting.init());

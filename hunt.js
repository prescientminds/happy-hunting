/* ============================================
   HAPPY HUNTING — Hunt Engine
   Envelope unlock, clue cards, answer validation
   ============================================ */

const HappyHunting = {
    hunt: null,
    currentStep: 0,
    skin: 'ransom',
    wrongAttempts: 0,
    isInvite: false,
    senderName: '',
    recipientName: '',
    urlKey: '',
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
            'envelope', 'code-row'
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
        this.skin = params.get('skin') || 'ransom';
        this.senderName = params.get('from') || '';
        this.recipientName = params.get('to') || '';
        this.urlKey = params.get('key') || '';
        this.isInvite = !!(this.senderName && this.urlKey);

        this.applySkin(this.skin);

        // Check for custom hunt in URL hash
        const hash = window.location.hash;
        if (hash.startsWith('#custom=')) {
            this.loadCustomHunt(hash.slice(8));
        } else {
            const huntId = params.get('hunt') || 'thunderbolt-hunt-1';
            await this.loadHunt(huntId);
        }

        if (!this.hunt) {
            this.showScreen('error');
            return;
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

        // Flash green
        digits.forEach(d => d.classList.add('correct'));

        // Break seal + slide envelope away
        setTimeout(() => {
            envelope.classList.add('opening');
        }, 500);

        // Transition to intro
        setTimeout(() => {
            this.renderIntro();
        }, 1200);
    },

    onWrongCode() {
        const digits = document.querySelectorAll('.code-digit');
        const row = this.els['code-row'];

        digits.forEach(d => d.classList.add('wrong'));
        row.classList.add('shake');

        setTimeout(() => {
            row.classList.remove('shake');
            digits.forEach(d => {
                d.value = '';
                d.classList.remove('wrong');
            });
            digits[0].focus();
        }, 600);

        this.els['unlock-feedback'].textContent = 'Not quite. Try again.';
    },

    // ---- Intro ----
    renderIntro() {
        this.els['hunt-theme'].textContent = this.hunt.theme;

        // Hide skin selector in invite mode (sender already chose)
        if (this.isInvite) {
            this.els['skin-selector'].style.display = 'none';
        }

        this.showScreen('intro');
    },

    // ---- Clue Rendering ----
    renderClue() {
        const step = this.hunt.steps[this.currentStep];
        this.els['step-label'].textContent = `Clue ${step.stepNumber} of ${this.hunt.steps.length}`;
        this.renderClueText(step.clue);

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

        this.showScreen('clue');
        setTimeout(() => this.els['answer-input'].focus(), 500);
    },

    renderClueText(text) {
        if (this.skin === 'ransom') {
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

    onCorrect(step) {
        this.els['answer-input'].disabled = true;
        this.els['answer-feedback'].textContent = step.answer;
        this.els['answer-feedback'].className = 'answer-feedback correct';
        this.els['answer-section'].classList.add('solved');

        this.els['answer-input'].classList.add('pulse-correct');
        setTimeout(() => this.els['answer-input'].classList.remove('pulse-correct'), 600);

        this.els['fact-text'].textContent = step.historicalFact;
        setTimeout(() => this.els['fact-reveal'].classList.add('visible'), 400);
    },

    onWrong(step) {
        this.wrongAttempts++;
        this.els['answer-feedback'].textContent = 'Not quite. Try again.';
        this.els['answer-feedback'].className = 'answer-feedback wrong';

        this.els['answer-input'].classList.add('shake');
        setTimeout(() => this.els['answer-input'].classList.remove('shake'), 350);

        if (this.wrongAttempts >= 3) {
            this.els['answer-feedback'].textContent = `Hint: starts with "${step.answer.charAt(0)}"`;
        }

        this.els['answer-input'].select();
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

        // Next clue
        this.els['next-btn'].addEventListener('click', () => this.nextClue());

        // Code digit inputs
        const digits = document.querySelectorAll('.code-digit');
        digits.forEach((input, i) => {
            input.addEventListener('input', () => {
                // Only allow digits
                input.value = input.value.replace(/\D/g, '');
                if (input.value && i < digits.length - 1) {
                    digits[i + 1].focus();
                }
                // Check code when all 4 entered
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
            // Select on focus for easy replacement
            input.addEventListener('focus', () => input.select());
        });
    }
};

document.addEventListener('DOMContentLoaded', () => HappyHunting.init());

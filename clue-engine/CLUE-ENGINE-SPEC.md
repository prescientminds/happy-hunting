# Happy Hunting — Clue Engine Specification

**Version:** 2.0
**Date:** 2026-03-16
**Change from v1:** Fundamental redesign based on Gold Room QA review. The Presence Test is now the primary quality gate. Answer taxonomy locked. Structures cut from 8 to 6. Narrative → Persona (person is clue, not answer). Photo → Moment (social, not verificational). Elimination → compound. Cipher → discovery-based.

---

## 1. The Presence Test

One rule governs every clue in the system:

**A clue must be easier to answer if you are physically at the location than if you are Googling from your couch.**

If someone can solve it faster with a search engine, the clue has failed — no matter how well-written, how interesting the history, or how satisfying the reveal. The walk was pointless.

This is Gate 1. It applies retroactively. Any clue that fails is rejected or rewritten.

---

## 2. Design Philosophy

Three principles, in priority order:

**1. The clue moves you to a place.** Every clue should physically move the solver to a specific spot. The answer lives at that spot — carved in stone, printed on a sign, visible on a building, countable on a facade. If the clue doesn't physically move them, it's not earning its place in the hunt.

**2. Design for engagement, not recall.** The solver should be doing something at the location: reading inscriptions, counting features, looking up at signs, identifying materials. "What year was this built?" is recall. "Read the cornerstone — what's the last word?" is engagement.

**3. The reveal is the gift.** When the answer drops, the solver learns something about the place they're standing in. The `historicalFact` is half the product. 1-3 sentences. The kind of thing you'd tell someone at the bar.

### What Makes a Bad Clue

| Anti-Pattern | Why It Fails | Example |
|-------------|-------------|---------|
| **Google job** | Answer is faster to search than to walk | "How much did the lotus thief make?" → $30,000 |
| **Concept answer** | Vague, unverifiable, not a specific word | "Cuban community," "barrier breakers," "the 1920s boom" |
| **Pure trivia** | You know it or you don't; being there adds nothing | "What animal's shell coats the dome?" → abalone |
| **Person-as-answer** | Biography → name is a Wikipedia lookup | "Who was the first woman to preach on radio?" → McPherson |
| **Answer in clue** | No discovery — solver reads, not reasons | Answer words appear in clue text |
| **No physical anchor** | Clue could be about any place | Historical facts with no observable element |

---

## 3. Answer Rules

### Allowed Answers

Answers must be **specific, unambiguous, and tied to the physical location**:

- **Words from inscriptions** — "What's the last word on the cornerstone?" → evangelism
- **Names on plaques/signs** — "Find the athlete's plaque. What's their name?" → Jackie Robinson
- **Counts of visible things** — "How many panels on the pedestal?" → 4
- **Colors you can see** — "What three colors are the bulbs?" → red, green, white
- **Materials you can observe** — "What material is the building?" → brick
- **Figures/images on physical features** — "What landmark is depicted?" → LA Central Library
- **Words/phrases on signs** — "What's the motto?" → Whenever You Are, We're Already There
- **Activities depicted** — "What does the rooftop sign show?" → bowling
- **Numbers from the environment** — "What number is on the building?" → 1706

### Banned Answers

- **Concepts or ideas** — "barrier breakers," "the 1920s boom," "Cuban community"
- **Dollar amounts** — "$30,000"
- **Historical dates not carved into anything** — "1972"
- **Person names as biography answers** — "Aimee Semple McPherson" (unless readable at the location)
- **Anything requiring Google to verify** — if you can't check it by looking around, it's banned

### The Phrasing Rule

If the answer would be a multi-word concept, the clue is asking the wrong question. Rephrase until the answer is a single observable thing.

Bad: "Why is the bust here?" → "Cuban community"
Good: "What name is inscribed on the bust?" → "Jose Marti"

---

## 4. The Four Structures

All four share one constraint: **the answer must be observable at the location.**

Eliminated structures (v2.0 → v2.1):
- **Elimination** — "which is false?" format is flat and uninteresting. Cut entirely.
- **Cipher** — Math-based clues ("count X, add Y") aren't exciting. The inputs feel arbitrary. Cut entirely.

### 1. Spotter

**What the solver does:** Go to a specific spot. Look at something. Report what they see.

The backbone of the system. The simplest, most reliable, most Google-proof structure.

**Subtypes:**
- **Count** — "How many panels / columns / letters?" → a number
- **Read** — "What word is carved after 'worldwide'?" → evangelism
- **Identify** — "What landmark is depicted on the panel?" → LA Central Library
- **Color/Material** — "What three colors are the bulbs?" → red, green, white
- **Misdirected** — Setup makes you expect one thing; the answer is something else you see. "This store sells Robot Milk. What organization's name is actually on the building?" → 826LA

**Difficulty levers:**
- Easy (1-3): Direct observation. "Find the sign. What does it say?"
- Medium (4-6): Indirect description of the target. "One panel shows a building full of books. Name it."
- Hard (7-9): Chain two observations or add inference. "The inscription has a hyphenated compound word that most people skim past. What is it?"

**Count rules:** Counts must be **under 12** and involve clearly discernible objects (columns, panels, stories, letters). Never count ambiguous things (garden beds, trees, people in a mural). The solver should be confident in their count.

**Architectural style rules:** When asking about a style, **cite famous examples** in the clue to help the solver identify it. "What medieval European style, also visible in Notre-Dame and Westminster Abbey, do you see in the pointed arches?" Not: "What architectural style is the pointed arch?"

**Translation rules:** Foreign-language words carved or printed in the physical environment make strong clues. "The inscription contains one Tagalog word meaning 'shared humanity.' What is it?" → Kapwa. The solver reads the physical text and applies the hint.

**Address rules:** Never give an address in the clue text and then ask for that address as the answer. Get the solver to the location through description ("find the house where three sisters practiced witchcraft on TV"), then ask about something observable there.

**Destination rule:** Never name the destination bar in clue text. Use "your destination" or "the bar" instead.

**Model clue (approved in QA):** "Look at the pedestal panels on the 14-foot statue. Each panel depicts a different LA landmark. One shows a venue where orchestras perform outdoors. One shows a place where ships dock. One shows a mountain range. One shows a building full of books. Name the building full of books." → LA Central Library

### 2. Persona

**What the solver does:** Read a first-person autobiographical riddle. Figure out who's speaking. Then find something physical connected to that person — the answer is what they **read or see** at that spot, not the person's name.

**Format:** "I [did thing]. I [did thing]. I [was known for thing]. Find my [temple / statue / plaque] — what does [specific observable thing] say?"

The person is the clue. The answer is at the location.

**Example:** "I was the first woman to preach on the radio. I drew 5,300 every Sunday. I disappeared from a beach and a city mourned. Find my temple at 1100 Glendale Blvd — what is the last word carved into the cornerstone?" → evangelism

**Why this works:** Solver figures out McPherson (engaging), walks to the temple (movement), reads the cornerstone (presence required). "Evangelism" can only be confirmed by being there.

**For statues:** "I am known for ___. Find where I stand — what does the pedestal say?" or "Find where I watch the sunrise" (if the statue faces east).

**For athletes on plaques:** "Won 4 golds in Berlin while a dictator watched. Find my plaque in the sidewalk. What is my name?" (Answer is readable on the ground.)

**Difficulty levers:**
- Medium (3-5): Generous hints, well-known person, direct address given.
- Hard (5-7): Fewer hints, location described but not addressed.
- Very hard (7-9): Abstract hints, answer requires reading something non-obvious at the location.

### 3. Connector

**What the solver does:** Link two things, but the answer is something **observable** — a material, a name, a feature you can see that connects them.

**Key rule:** The answer is not a concept. The answer is a physical thing.

**Bad connector:** "What single event explains why both were built?" → "the 1920s boom" (concept, not observable)
**Good connector:** "A German immigrant made his fortune manufacturing one material — the same material he used to build the recreation center at 1706 W Sunset. Look at the building. What material?" → brick (observable)

**Difficulty levers:**
- Medium (4-6): Two things at the same stop, connection is the material/style/name you can see.
- Hard (7-9): Two things at different stops, connection requires inference plus observation.

### 4. Moment

**What the solver does:** Take a photo. Optionally send it to the person they're meeting.

**This is not a test.** No answer-checking, no verification, no text answer. A moment is date infrastructure — a prompt to engage with the space visually and share the experience.

**Format:** A short, evocative prompt. "You're about to walk through a century of Echo Park history. Take a photo of the first thing that catches your eye." Or: "Look down. You're walking on a hall of fame. Find a plaque and snap a photo — you'll want to show this one later."

**Why moments exist:** They pace the hunt. Between puzzles, the solver needs a breather. Moments also produce shareable content — photos the solver sends to their date, building anticipation.

**Placement:** One per ring, always at D1. The easiest slot. Sets the tone, orients the solver, produces a photo.

---

## 5. Difficulty Model

Difficulty is the length and complexity of the reasoning path — not the obscurity of the answer.

### 10-Point Scale

| Level | Reasoning Path | Solver Experience |
|-------|---------------|-------------------|
| **1** | Moment. No reasoning required. | Engage, take a photo, move on. |
| **2-3** | One step. Direct observation. | "I see it" — read a sign, count a thing. |
| **4-5** | One step with inference. Notice something that requires thought. | "Oh wait" — brief pause, then click. |
| **6-7** | Two steps. Combine two observations or apply a rule. | "Let me think" — 30-60 seconds. |
| **8-9** | Two steps with misdirection or cross-referencing. | "That can't be right" — restructuring moment. |
| **10** | Three steps, or requires synthesizing observations from multiple spots. | "OH" — delayed aha, strong satisfaction. |

### What Changes, What Doesn't

**Changes with difficulty:** Number of reasoning steps. How directly the clue points to the target. Whether the answer is obvious or requires inference from observation.

**Never changes:** Fairness. Reveal quality. Physical engagement. The answer is always at the location, at every difficulty level.

---

## 6. Quality Gates

Every clue passes through these gates. No exceptions. Order matters — later gates don't matter if earlier ones fail.

### Gate 1: The Presence Test
Can this clue be answered faster by being at the location than by Googling? If no → reject.

### Gate 2: Answer Type Check
Is the answer an allowed type (Section 3)? Observable, specific, tied to physical location? If no → reject or rephrase the question.

### Gate 3: Answer Not in Clue
Do any distinctive words from the answer appear in the clue text? If yes → rewrite.

### Gate 4: Reasoning Path Audit
Write out the solving steps. If any step requires information that isn't provided, observable, or reasonably inferable → reject. If the path forks (two plausible answers) → reject.

### Gate 5: Math/Logic Validation
For ciphers and counts: execute the math. Does it produce the stated answer? Check off-by-one. If fragile → simplify.

### Gate 6: Observable Verification
Has the physical feature this clue depends on been verified? Is the sign still there? Is the inscription readable? Features flagged `needsVerification: true` cannot anchor a clue until confirmed.

### Gate 7: Groan Test
When the answer is revealed, does the solver light up or groan? Light up → the answer reframes the clue. Groan → arbitrary or boring. Shrug → rewrite the reveal.

### Gate 8: Reveal Quality
The `historicalFact` tells a story, not a date. Would you tell it at the bar? 1-3 sentences.

---

## 7. Place Intelligence Layer

Unchanged from v1. Key emphasis: the **observable** layer is what makes on-site clues possible. Without documented observable features, the engine can only produce trivia.

Every POI needs:
- `observable.features[]` — typed array of what you can see, read, count, photograph
- Feature types: `sign`, `architecture`, `count`, `color`, `artwork`, `plaque`, `oddity`, `streetNumber`
- `needsVerification` flag on any feature not confirmed by recent Street View or site visit
- `connections[]` — links between POIs for connector clues

**Rule:** A clue cannot depend on an unverified feature. If the feature has `needsVerification: true`, the clue gets flagged until confirmed.

---

## 8. Route System

Unchanged from v1.

- **Ring 1** = Farthest from bar. Walk begins here. Warm-up.
- **Ring 2** = Middle of route. Core challenge.
- **Ring 3** = Near the bar. Arrival. Payoff.

Each ring maps to a physical stop with lat/lng. The solver walks from stop to stop, toward the bar.

---

## 9. Compiler Pipeline

### Input
Bar ID + Place Profile + target ring/difficulty/structure.

### Process

1. **Material Selection** — Pull observable features, facts, and connections for the target POI.
2. **Structure Application** — Apply the selected structure's rules (Section 4). The answer must come from observable features.
3. **Answer-First Design** — Start with the answer (an observable thing), then build the clue backward. This prevents trivia drift. "The answer is 'evangelism' because it's the last word on the cornerstone. Now write a clue that leads to reading the cornerstone."
4. **Difficulty Calibration** — Adjust reasoning path length to match target difficulty.
5. **Quality Gates** — Run all 8 gates (Section 6). Any failure → revise or reject.
6. **Reveal Authoring** — Write `historicalFact`. This is the payoff. Bar-worthy story. 1-3 sentences.

### Answer-First Design (Critical Change from v1)

v1 built clues fact-forward: start with an interesting historical fact, construct a question about it. This produced trivia. v2 builds clues **answer-first**: start with something observable at the location, then build a clue that leads the solver there.

The sequence:
1. What can the solver see/read/count at this stop? → "Cornerstone says 'evangelism'"
2. What's the most engaging way to lead them to read it? → Persona riddle about McPherson
3. What's the reveal that makes them glad they came? → The McPherson kidnapping story

### Output

```json
{
  "ring": 1,
  "difficulty": 5,
  "type": "persona",
  "clue": "I was the first woman to preach on the radio. I drew 5,300 every Sunday. I disappeared from a beach and a city mourned. Find my temple at 1100 Glendale Blvd — what is the last word carved into the cornerstone?",
  "answer": "evangelism",
  "answerVariants": ["evangelism"],
  "historicalFact": "Aimee Semple McPherson opened Angelus Temple on New Year's Day, 1923 — all 5,300 seats filled. She pioneered radio evangelism, staged illustrated sermons with Broadway-level production, and vanished from Venice Beach in 1926. Two people died searching for her. She reappeared five weeks later walking out of the Mexican desert.",
  "verificationStatus": "confirmed",
  "reasoning": "Solver identifies McPherson from biography → walks to 1100 Glendale → reads cornerstone → last word is 'evangelism.' Presence required: cornerstone text is not consistently reproduced in search results with exact wording."
}
```

---

## 10. Pool Composition

### Per-Bar Pool
- 3 stops (Ring 1, Ring 2, Ring 3)
- 10 difficulty levels per stop (1-10)
- 30 clues total per bar

### Structure Distribution per Ring (10 clues)

| Structure | Count | Notes |
|-----------|-------|-------|
| **Moment** | 1 | Always at D1. Photo breather, sets the tone. |
| **Spotter** | 5-7 | The backbone. Majority of every ring. |
| **Persona** | 1-2 | Medium-high difficulty. Needs rich biography + observable feature. |
| **Connector** | 1-2 | Answer must be observable. Links two physical things through discovery. |

### Anti-Monotony Rule
No three consecutive difficulty levels should use the same structure.

---

## 11. Tone & Voice

### Clue Text
- **Direct.** Start with the interesting part.
- **Curious.** "Look at this" not "answer this question."
- **Specific.** "12 columns" not "many columns."
- **Brief.** 2-4 sentences. If it needs more, the clue is too complicated.

### Persona Voice
- First person. "I was..." "I drew..." "Find my..."
- Rhythmic escalation. Each sentence more specific than the last.
- End with a physical instruction. "Find my temple." "Look at my plaque." "What does my cornerstone say?"

### Reveal Voice
- Generous. Give the good stuff.
- Storytelling. A detail that makes them see the place differently.
- 1-3 sentences. Bar-worthy.

### Never Sounds Like
- A textbook, a tour guide, a quiz show, or a Wikipedia article.

---

## 12. Onboarding a New Bar

1. **Geocode** the bar.
2. **Pull POIs** — Wikipedia Geosearch + Overpass + existing KB within 0.3mi.
3. **Recon** — Street View or site visit to document observable features.
4. **Build Place Profile** — Facts, observable features, connections.
5. **Design route** — 3 stops, Ring 1 farthest, Ring 3 nearest.
6. **Generate clues answer-first** — Start with observable features, build clues backward.
7. **Quality gates** — All 30 clues pass all 8 gates.
8. **Human review** — Clue QA tool. Edit, approve, or regenerate.
9. **Publish** — Clues enter pool. Hunt goes live.

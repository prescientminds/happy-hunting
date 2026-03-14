# Clue Engine: Puzzle Templates
## 20 Reusable Formats for Location-Based Scavenger Hunts

Built from NYT Games (Connections, Wordle, Strands, Spelling Bee), MIT Mystery Hunt, DASH, Puzzled Pint, geocaching, Watson Adventures.

---

## WORD PLAY

### 1. Anagram
Scramble letters of a street/landmark name. Solver unscrambles.
- **Easy:** Short name, one word (YRUDAEB = BEAUDRY)
- **Medium:** Two-word name with a thematic hint
- **Hard:** No hint, longer phrase, partial scramble
- **Input:** Street/landmark name
- **Automatable:** Trivially

### 2. Hidden Word
Answer embedded across word boundaries in a sentence.
- **Easy:** Short hidden word, obvious sentence
- **Medium:** Longer word, natural-sounding prose
- **Hard:** Spans 3+ source words, misleading context
- **Input:** Street/place name, sentence construction
- **Example:** "The road OVER LANd was beautiful" → OVERLAND

### 3. Acrostic
First letters (or Nth letters) of clue answers spell the location.
- **Easy:** First letters, simple definition clues
- **Medium:** Nth letter extraction
- **Hard:** Clues are themselves mini-puzzles
- **Input:** Location name to encode, one clue per letter

### 4. Rebus
Pictures/symbols/word fragments combine to build a name.
- **Easy:** Straightforward picture math (SUN + SET = SUNSET)
- **Medium:** Subtraction involved
- **Hard:** Multiple operations, abstract symbols
- **Input:** Name decomposable into common words/syllables

---

## PATTERN RECOGNITION

### 5. Connections Grid (NYT Connections)
12-16 items grouped into 3-4 categories by hidden shared property.
- **Yellow (easy):** Obvious semantic grouping ("streets named after presidents")
- **Green:** Requires local knowledge
- **Blue:** Lateral thinking ("streets that are also fabrics")
- **Purple:** Phonetic/structural hidden pattern ("each name contains an animal")
- **Input:** 12-16 location names with taggable categories
- **Automatable:** High — needs category database

### 6. Odd One Out
4-5 items that appear to belong together. One doesn't.
- **Easy:** Outlier from obviously different category
- **Medium:** All plausible, subtle criterion distinguishes
- **Hard:** Criterion itself is hidden
- **Input:** 4-5 locations with categorizable properties

### 7. Sequence
Items in a pattern. Solver identifies rule, predicts next (= destination).
- **Easy:** Alphabetical/numerical
- **Medium:** Thematic pattern ("presidents in order")
- **Hard:** Requires external knowledge or multiple dimensions
- **Input:** 3-5 ordered locations following a rule

### 8. Strands Search
Letter grid containing 4-6 hidden location names + a theme word.
- **Easy:** Word search with stated theme
- **Medium:** Theme unstated, discovered from found words
- **Hard:** Words overlap, share letters, require diagonal reading
- **Input:** Thematically related street names

---

## KNOWLEDGE / TRIVIA

### 9. Bio-Riddle
Describe a historical person through 3-5 escalating clues. Street named after them.
- **Easy:** Famous person, distinctive clues
- **Medium:** Regional figure, requires inference
- **Hard:** Obscure figure, early clues ambiguous
- **Input:** Biographical data per eponymous street
- **Example:** "Born in Mexico in the 1700s / Governed a territory larger than most nations / Never visited the city bearing his name" → FIGUEROA

### 11. Date Cipher
Historical date's digits encode the answer (A=1 mapping or index into a phrase).
- **Easy:** Direct mapping with stated rule
- **Medium:** Date must be found on-site (plaque/cornerstone)
- **Hard:** Cipher type unstated or secondary encoding
- **Input:** Significant date tied to location

### 12. Etymologist
Give linguistic origin/meaning of a name. Solver translates or traces etymology.
- **Easy:** Common language, direct translation
- **Medium:** Compound word or requires knowing source language
- **Hard:** Disputed etymology, multi-language chain
- **Input:** Street name etymology, source language, meaning
- **Gold mine for LA:** Disproportionately Spanish, Tongva, biographical names

---

## OBSERVATION (ON-SITE)

### 13. Spotter
Find and report something only visible in person — number, word, color, count.
- **Easy:** Obvious target ("What year above the entrance?")
- **Medium:** Requires searching ("How many gargoyles on the east face?")
- **Hard:** Subtle or requires interpretation
- **Input:** Exact location + observable detail + verified answer
- **Anti-cheat:** Strongest mechanism — cannot Google it

### 14. Photo Match
Cropped/rotated/obscured photo of an architectural detail. Find it in person.
- **Easy:** Wide shot, obvious framing
- **Medium:** Tight crop of a detail (doorknob, tile pattern)
- **Hard:** Historical photo — find same vantage point, identify what changed
- **Input:** On-site photos

### 15. Counter
Count specific objects at a location. Count feeds into next clue.
- **Easy:** Count obvious things ("windows on front of building")
- **Medium:** Requires a definition ("businesses with Spanish names on this block")
- **Hard:** Ambiguous counting criteria
- **Input:** Location + countable objects + verified count
- **Chains naturally** into next clue via the number output

---

## LOGIC / DEDUCTION

### 16. Elimination Grid
Logic grid: rows = locations, columns = properties. Clues eliminate until one mapping remains.
- **Easy:** 3x3, direct clues
- **Medium:** 4x4, clues require inference
- **Hard:** 5x5, some clues require on-site observation
- **Input:** 3-5 locations with distinguishing properties

### 17. Cipher Walk
Encrypted message. Key to decrypt found at a physical location.
- **Easy:** Caesar cipher, shift number stated
- **Medium:** Shift number found on-site (house number = key)
- **Hard:** Cipher type unstated (Morse, semaphore, pigpen)
- **Input:** Message + cipher method + physical key at location
- **Geocaching's most common puzzle format**

### 18. Matchmaker
Two lists (locations + facts). Match pairs. Matched pairs reveal answer.
- **Easy:** Facts clearly match one location each
- **Medium:** Some facts plausibly match multiple
- **Hard:** Requires on-site research, non-obvious extraction
- **Input:** 4-6 locations with matchable facts

### 19. Route Decoder
Series of directional instructions where each turn/stop produces a letter. Accumulated letters spell the answer.
- **Easy:** Letter position stated directly
- **Medium:** Position derived ("take letter = number of blocks walked")
- **Hard:** Directions as compass bearings, solver identifies streets
- **Input:** Walkable route + street names + extraction rule
- **DASH/ClueKeeper core format** — walk itself is the puzzle

### 20. Meta-Puzzle
After solving individual clues, answers feed into a final puzzle.
- **Easy:** First letters spell the answer
- **Medium:** Answers reordered by criterion before extraction
- **Hard:** Answers share a hidden pattern not apparent from individual clues
- **Input:** Individual answers designed to feed coherent meta-extraction
- **Backbone of MIT Mystery Hunt, DASH, Puzzled Pint**

---

## DIFFICULTY SCALING PRINCIPLES

1. **Remove instructions.** Easy tells solver what to do. Hard makes them figure out the mechanic.
2. **Add ambiguity.** Easy = one plausible answer. Hard = multiple until distinguishing detail found.
3. **Layer mechanics.** Single-mechanic (anagram) easier than compound (anagram from cipher output).
4. **Require presence.** Any template gets harder when data must be gathered on-site.
5. **Delay confirmation.** Hard puzzles don't confirm correctness until final extraction.
6. **Control knowledge requirements.** Easy = general knowledge. Medium = local/historical. Hard = specialized.

---

## AUTOMATION RANKING (best → hardest to generate programmatically)

1. Anagram — input: name → output: scrambled. Trivial.
2. Two Truths and a Lie — needs fact database
3. Odd One Out — needs categorized location properties
4. Connections Grid — same database, higher combinatorial complexity
5. Bio-Riddle — needs biographical data per eponymous street
6. Etymologist — needs etymology database
7. Hidden Word — needs sentence generation (LLM)
8. Sequence — needs pattern detection across dataset
9. Spotter/Counter — requires field research per location. Hardest to automate, strongest engagement.

---

## NOTE ON "BLICK"
No company found under this name in the scavenger hunt / outdoor puzzle space. May be remembered under a different name, or too small/local to be indexed. If more details surface, can research again.

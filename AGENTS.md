# AGENTS.md — Debate Referee

## 0. How to use this file

This is the master context for building **Debate Referee**, a hackathon project for the UC Berkeley AI Hackathon 2026. Read this fully before writing any code. It tells you what we are building, why, the exact tech stack, the architecture, the build order, and what NOT to build. Optimize every decision for one thing: a clean, high-energy live demo that judges can play with themselves, finished within a 24 hour window.

When in doubt, prefer the choice that makes the demo more impressive and less likely to break. Working and visible beats clever and hidden.

Style rule for any docs or copy you generate: do not use em-dashes.

---

## 1. One-line summary

**Debate Referee is a live AI referee for spoken arguments. Two people argue out loud, it separates their voices, calls out logical fallacies in real time, scores each side, and declares a winner like a game show.**

Metaphor:

> An instant-replay ref, but for arguments instead of sports.

---

## 2. The core idea and why it works

People argue constantly, but nobody keeps score and nobody catches the cheap moves (strawmen, dodges, whataboutism). Debate Referee watches a live argument and acts as a neutral, funny, slightly dramatic ref. It catches the fouls, rewards the strong points, and crowns a winner.

This is a creative/fun project, not a serious tool. That is intentional. It targets a track that rewards delight and creativity over heavy engineering, and the demo is the product. There is no "but how would this work in the real world" hole, because watching the ref work IS the whole experience.

---

## 3. Hackathon goals (in priority order)

1. **Win or place in a sponsor prize.** Deepgram is the primary target (highest odds). Redis is the secondary bonus.
2. **Contend for the Ddoski's Playground main track** (creative / fun / unconventional). This is the thinnest, most winnable main track at an engineer-heavy event.
3. **Nail the demo.** This project lives or dies on the room's reaction. The judges should laugh, say "oooh," and want to try it.

Prize alignment (build with these in mind):

- **Deepgram (top priority):** use speech-to-text, speaker diarization, AND text-to-speech (the ref talks out loud). Using all three is a strong claim on their prize. Prize is a Nintendo Switch 2 per team member.
- **Redis (bonus):** store the fallacy taxonomy in Redis vector search and retrieve relevant fallacies per turn. This is "Redis beyond caching" (vector search, retrieval), which is exactly what they reward. Build this only after the core loop works.
- **Anthropic:** we are building with Codex so we are technically eligible, but a debate game is a small swing in a non-target domain. Do not spend design effort chasing this prize. It is a freebie if it comes, not a goal.

Do NOT add a fourth sponsor integration. Three things that can break is the ceiling. Core working app beats a pile of half-integrations.

---

## 4. The demo (design everything around this)

This is the exact experience to build toward:

1. A topic appears on screen (e.g. "Pineapple belongs on pizza").
2. Two people argue out loud. The app labels them Speaker A and Speaker B with distinct colors.
3. As they talk, a live transcript streams in, color-coded by speaker.
4. When someone commits a fallacy, a flag pops on their line: the fallacy name, a one-line "why," and a point penalty. The scoreboard reacts instantly.
5. Strong, well-supported points earn points. The scoreboard is always visible and always moving.
6. The ref occasionally calls fouls out loud in a dramatic voice (text-to-speech), like "Strawman! Minus two, Speaker B."
7. At the end, the ref declares a winner with a short, funny verdict summary.

The two "wow" moments: the live scoreboard shifting as the argument unfolds, and the ref's voice calling a foul. Protect both.

**Demo safety rule:** the primary demo runs on a PRE-RECORDED scripted debate clip, not a live mic. This guarantees the demo never fails on stage. Live mic mode is a bonus toggle, used only if it is rock solid. Build recorded-clip mode first and treat it as the real demo.

---

## 5. Tech stack

Keep it to a single Next.js app. No microservices, no separate backend server.

### Frontend
- Next.js (App Router) + TypeScript
- Tailwind CSS
- shadcn/ui if it speeds things up, optional
- Web Audio API / MediaRecorder for live mic mode (secondary)

### Audio (Deepgram)
- Deepgram streaming Speech-to-Text with diarization enabled (returns transcript with speaker labels)
- Deepgram Text-to-Speech for the ref's voice callouts
- For recorded-clip mode, stream the audio file through the same Deepgram pipeline

### Reasoning (Anthropic Codex)
- Codex API for the per-turn analysis (fallacy detection, scoring, verdict)
- Recommended model: `Codex-sonnet-4-6` for the latency/quality balance needed in a near-real-time loop. Use `Codex-haiku-4-5` if a particular call needs to be even faster (e.g. quick foul callouts). Output must be structured JSON.

### Vector store / retrieval (Redis)
- Redis Stack with vector search (RediSearch) for the fallacy taxonomy RAG
- Use Redis Cloud (sponsor gives credits) or local Docker, whichever is faster to stand up
- Embed each fallacy definition once at seed time, then vector-search per turn

### State
- In-memory session state is fine for a single live debate
- Optionally persist the current session in Redis so a refresh does not wipe it
- Do not build user accounts or a real database

### Deployment
- Local for the live demo is safest (fewer network surprises). Vercel is fine as a backup.

### Environment variables
```
DEEPGRAM_API_KEY=
ANTHROPIC_API_KEY=
REDIS_URL=
```

---

## 6. Architecture and data flow

The pipeline is engine-agnostic about what it flags. We flag logical fallacies. The flow:

1. **Audio in:** recorded clip (primary) or live mic (secondary).
2. **Transcribe + diarize:** stream audio to Deepgram. Get partial transcripts tagged with speaker labels.
3. **Segment into turns:** buffer the stream into discrete "turns" (split on speaker change or a pause).
4. **Analyze each completed turn:**
   a. Embed the turn text, vector-search Redis for the most relevant fallacy definitions.
   b. Send the turn text plus the retrieved fallacy context to Codex.
   c. Codex returns JSON: detected fallacies (type, severity, exact quote, short explanation), an argument-strength rating, and a point delta.
5. **Update the scoreboard** for that speaker.
6. **Render the flag** inline on the transcript.
7. **Trigger a TTS callout** for high-severity fouls (Deepgram TTS), kept short.
8. **End debate:** send the full turn history to Codex for a final verdict and winner, then announce it.

Keep the analysis call fast. One turn, one call. Do not batch the whole debate.

---

## 7. Data model (TypeScript)

```ts
export type Speaker = "A" | "B";
export type DebateStatus = "setup" | "live" | "finished";

export interface Fallacy {
  type: string;        // e.g. "Strawman"
  severity: 1 | 2 | 3; // 1 minor, 3 egregious
  quote: string;       // the exact phrase that triggered it
  explanation: string; // one line, plain English
}

export interface Turn {
  id: string;
  speaker: Speaker;
  text: string;
  timestamp: number;
  fallacies: Fallacy[];
  argumentStrength: number; // 0 to 5
  pointDelta: number;       // can be negative
}

export interface DebateSession {
  id: string;
  topic: string;
  status: DebateStatus;
  turns: Turn[];
  scoreA: number;
  scoreB: number;
  winner?: Speaker | "draw";
  verdict?: string;
}
```

Fallacy definitions live in Redis, not in this model:

```ts
export interface FallacyDef {
  name: string;
  definition: string;
  examples: string[];
  embedding: number[]; // set at seed time
}
```

---

## 8. Fallacy taxonomy (seed Redis with these)

Seed roughly 15 to 20. Starter set:

- Strawman
- Ad hominem
- Slippery slope
- False dilemma (false dichotomy)
- Appeal to authority
- Circular reasoning (begging the question)
- Red herring
- Moving the goalposts
- Whataboutism (tu quoque)
- Hasty generalization
- Appeal to emotion
- No true Scotsman
- False equivalence
- Gish gallop
- Appeal to ignorance
- Loaded question
- Bandwagon (appeal to popularity)

Each entry needs a name, a one-sentence definition, and 2 to 3 short example phrases. Embed the definition + examples for vector search.

---

## 9. Scoring rules

Keep it simple and legible so the audience instantly understands why the score moved.

- Substantive point with reasoning or evidence: +2 (scale with argumentStrength, max +3)
- Direct rebuttal that counters the opponent's last point: +1 bonus
- Fallacy committed: minus the severity (so a severity-3 fallacy is minus 3)
- Keep running totals for A and B, always visible

The point delta should feel fair and obvious. If a viewer cannot tell why a score changed, the magic breaks.

---

## 10. Codex analysis prompt (adapt this)

Per-turn analysis prompt:

```txt
You are Debate Referee, a sharp, fair, and slightly theatrical judge of live arguments.

You are given one speaker's turn and a short list of candidate logical fallacies retrieved as reference.

Analyze ONLY this turn. Rules:
- Detect logical fallacies actually present. Do not invent fallacies to seem strict. A clean turn should return an empty fallacy list.
- For each fallacy: give its type, a severity from 1 to 3, the exact quote that triggered it, and a one-line plain-English explanation.
- Rate the argument strength from 0 to 5 based on reasoning and evidence, not just confidence.
- Compute a pointDelta using: +2 for a substantive supported point (up to +3 if strong), +1 bonus if it directly rebuts the opponent, minus the severity for each fallacy.
- Be fair and consistent. False flags ruin the experience.

Return ONLY JSON in this shape, no preamble or markdown:

{
  "fallacies": [
    {"type": "...", "severity": 1, "quote": "...", "explanation": "..."}
  ],
  "argumentStrength": 0,
  "pointDelta": 0
}

Candidate fallacies (reference):
{{RETRIEVED_FALLACIES}}

Opponent's previous turn (for rebuttal context, may be empty):
{{PREVIOUS_TURN}}

Speaker's current turn:
{{TURN_TEXT}}
```

Final verdict prompt:

```txt
You are Debate Referee delivering a closing verdict for a live audience.

Given the full debate (topic, all turns, fallacies, and final scores), write a short, fun, confident verdict.

Rules:
- 3 to 4 sentences max.
- Name the winner (or call a draw) and give the single clearest reason.
- Mention the most memorable foul or the strongest point.
- Keep it punchy and a little theatrical. This is read out loud.

Topic: {{TOPIC}}
Final score: A {{SCORE_A}}, B {{SCORE_B}}
Turns: {{TURNS_JSON}}
```

---

## 11. Build order

Build in this sequence. Get a visible, demoable thing fast, then deepen.

1. Scaffold Next.js + TypeScript + Tailwind.
2. Define the types from section 7.
3. **Build the UI shell with MOCK data first:** topic banner, two-speaker transcript with colors, live scoreboard, fallacy flag component, winner card. This lets you demo the look before any AI works.
4. Get Deepgram STT + diarization working on a recorded clip. Print transcript with speaker labels.
5. Seed the Redis fallacy taxonomy and confirm vector search returns sensible matches.
6. Build the Codex analysis route: turn in, JSON flags + score out. Test on hand-written turns.
7. Wire the full pipeline: audio -> transcript -> per-turn analysis -> scoreboard updates live on screen.
8. Add Deepgram TTS ref callouts for high-severity fouls.
9. Add the final verdict generation and winner announcement.
10. Polish: score-change animations, foul-flag pop animation, clear speaker colors, readable layout from across a room.
11. Record the demo clip, script the pitch, rehearse.

If you run low on time, cut in this order: TTS callouts last-resort kept, Redis can fall back to a hardcoded fallacy list passed inline to Codex, live mic mode dropped entirely. Never cut the recorded-clip core loop or the live scoreboard.

---

## 12. Scope control

### Must have (the demo fails without these)
- Recorded-clip audio input
- Diarization (Speaker A vs B)
- Per-turn fallacy detection
- Live, always-visible scoreboard
- Final winner with a verdict

### Nice to have (add if time allows)
- Deepgram TTS ref voice callouts
- Live mic mode
- Topic picker / preset topics
- Rebuttal detection bonus
- Replay of the debate

### Do NOT build
- User accounts or auth
- A real database or migrations
- Multi-room or multi-user infrastructure
- A mobile app
- Real telephony or call infrastructure
- Tournament brackets
- Anything that is not visible in the 4-minute demo

---

## 13. What decides whether we win (engineering priorities)

1. **Fallacy detection must be sharp.** A false flag (calling a strawman that is not one) breaks the illusion and makes it look dumb. Tune the prompt, lean on the Redis grounding, and test on real arguments before judging. A ref that makes bad calls is worse than no ref.
2. **The live scoreboard must be satisfying.** The core wow is watching the score shift in real time. If it feels laggy or unclear, the magic dies. Spend real polish time here.
3. **Latency must feel live.** Use a fast model, analyze one turn per call, and show a "ref is thinking" state so a small delay reads as deliberation, not lag.
4. **It must be legible from across a room.** Judges watch from a distance. Big speaker colors, big score, big flags.

---

## 14. Anti-patterns to avoid

- Do not over-engineer. No clever abstractions, no premature optimization.
- Do not build real-time live-mic infrastructure before the recorded-clip path works.
- Do not let the AI be trigger-happy with fallacies to seem smart. Clean turns get no flags.
- Do not bury the score or the flags in a busy UI. The two key visuals stay front and center.
- Do not add a fourth sponsor integration.
- Do not use em-dashes in any generated text or copy.

---

## 15. Pitch (for reference, not for code)

> Everyone argues. Nobody keeps score, and nobody catches the cheap moves. Debate Referee is an instant-replay ref for arguments. Two people debate out loud, it separates their voices, catches the strawmen and the dodges live, scores both sides, and crowns a winner. It is fair, it is fast, and it is a little bit savage.

Build the product around that feeling: a fair, fast, slightly savage ref that makes a live argument into a game.

# Collina — AI Debate Referee

Two people argue out loud. Collina separates their voices, catches logical fallacies in real time, moves a live scoreboard, calls out fouls in a dramatic AI voice, and crowns a winner.

> Built with **Deepgram** (speech-to-text + diarization + text-to-speech), **Claude** (fallacy analysis + verdict), and **Redis** (fallacy vector search).

---

## ⚡ TL;DR

```bash
npm install
npm run dev
```

Open **http://localhost:3000** → click **"Start the chaos"**. That's the full demo, no keys needed.

---

## 🎮 Two ways to run it

| Button | What it does | Needs keys? |
|---|---|---|
| **Start the chaos** | Plays a scripted debate (mock). Polished, offline, can't fail. **Use this for the demo.** | ❌ No |
| **Go live (mic)** | Real-time: you + a friend talk into the mic, the AI judges live. | ✅ Yes (see below) |

---

## 1️⃣ Mock demo (works right now)

```bash
npm install      # one time
npm run dev      # start the app
```

1. Open **http://localhost:3000**
2. Press **`F`** for fullscreen presentation mode
3. Click **"Start the chaos"**

No API keys, no internet, no setup. This is the stage-safe demo.

---

## 2️⃣ Live mode (real mic + real AI)

Live mode needs three services. Do these once:

### Step 1 — Add your keys
Copy the example file and fill it in:
```bash
cp .env.example .env
```
Edit `.env`:
```env
ANTHROPIC_API_KEY=sk-ant-...        # Claude (analysis + verdict)
DEEPGRAM_API_KEY=...                # Deepgram (mic + voice) — needs "Member" role
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_USE_REAL_PIPELINE=true  # turn the real pipeline ON
```

### Step 2 — Start Redis
```bash
docker run -d --name debate-redis -p 6379:6379 redis/redis-stack:latest
npm run seed:redis     # load the fallacy taxonomy (run once)
```

### Step 3 — Run it
```bash
npm run dev
```
Open **http://localhost:3000** → click **"Go live (mic)"** → allow the microphone → debate → click **"End debate"** for the verdict.

> 🎙️ **Tip for clean voice separation:** take clear turns, don't talk over each other, and ideally use two distinct-sounding voices.

---

## ⌨️ Controls

| Key / Button | Action |
|---|---|
| `Start the chaos` | Run the mock demo |
| `Go live (mic)` | Start a real-time mic debate |
| `End debate` | Stop the mic and get the verdict |
| `F` | Fullscreen presentation mode |
| `M` | Mute / unmute the AI ref voice |
| `R` | Restart the debate |

---

## 🧰 Commands

```bash
npm run dev             # start the app (http://localhost:3000)
npm run build           # production build
npm run lint            # strict TypeScript check
npm run seed:redis      # load fallacies into Redis (live mode)
npm run test:scoring    # verify the scoring math
npm run test:analyze    # test fallacy detection (needs Anthropic key + Redis)
npm run test:transcribe -- <audio-file>   # test a recorded clip
```

---

## 🩹 Troubleshooting

| Problem | Fix |
|---|---|
| **"credit balance too low"** (analysis/verdict fail) | Add credits to your Anthropic account → console.anthropic.com → Plans & Billing |
| **403 on mic / "Insufficient permissions"** | Your Deepgram key needs the **Member** role — create a new key with it |
| **Live mic does nothing** | Check `NEXT_PUBLIC_USE_REAL_PIPELINE=true`, all keys set, Redis running, mic permission allowed |
| **Redis errors** | Start it: `docker start debate-redis` (then `npm run seed:redis`) |
| **Falls back to mock** | That's intentional when keys/flag are missing — the demo always works |

---

## 🧠 How it works

```
Audio ─▶ Deepgram (transcribe + who-said-what)
      ─▶ split into turns
      ─▶ Redis finds the most relevant fallacies
      ─▶ Claude judges the turn (fallacies + strength)
      ─▶ score updates live  +  Deepgram voices the foul
End  ─▶ Claude delivers the winner's verdict
```

The UI imports only `startDebate` and `getVerdict` from `lib/debate-client.ts`. Mock and real pipelines share that exact contract, so the UI is identical either way.

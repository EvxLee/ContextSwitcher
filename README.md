# Collina

Collina is a playful live AI referee for spoken debates. Two people argue, the app separates their voices, catches logical fallacies, moves a live scoreboard, calls out major logic glitches, and declares a winner.

The frontend currently uses timed mock turns so UI work can continue safely while Evan's real Deepgram, Claude, and Redis pipeline is developed in parallel. Both implementations preserve the same `startDebate` and `getVerdict` contract.

## Quick start

```powershell
npm install
npm run preflight
npm run dev
```

Open `http://localhost:3000`, press `F` for presentation mode, and click `Start the chaos`.

No API keys are required for the mock demo.

## Real pipeline environment

After the backend branch is merged, copy `.env.example` to `.env.local` and add:

```env
DEEPGRAM_API_KEY=
ANTHROPIC_API_KEY=
REDIS_URL=redis://localhost:6379
```

Never expose these values with `NEXT_PUBLIC_` and never commit `.env.local`.

## Commands

```powershell
npm run dev           # Start the local app
npm run preflight     # Check keys, client mode, Node, and demo audio
npm run lint          # Run strict TypeScript checks
npm run test:scoring  # Verify deterministic scoring
npm run build         # Create the production build
npm run check         # Run the complete verification sequence
```

## Stage controls

- `F`: enter or exit presentation mode
- `M`: mute or restore the AI ref
- `R`: restart the debate

## Demo preparation

See [DEMO_RUNBOOK.md](./DEMO_RUNBOOK.md) for the four-minute pitch, recorded debate script, fallback ladder, and stage checklist.

## Integration contract

The UI imports only `startDebate` and `getVerdict` from `lib/debate-client.ts`. Evan's real client must preserve that interface. The existing mock client remains the stage-safe fallback after the merge.

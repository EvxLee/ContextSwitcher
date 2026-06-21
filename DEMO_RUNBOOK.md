# Collina Demo Runbook

## The one-line pitch

Collina turns a spoken argument into a live game where an AI ref catches bad logic, rewards strong points, and calls the winner.

## Four-minute stage plan

### 0:00 to 0:25: Hook

Say:

> Everyone argues, but nobody keeps score and nobody catches the cheap moves. Collina is an AI debate playground that listens live, catches fallacies, and decides who actually made the better case.

Keep the setup screen visible. Do not explain the architecture yet.

### 0:25 to 1:50: Run the debate

1. Press `F` for presentation mode.
2. Click `Start the chaos`.
3. Let the first strong point land without talking over it.
4. When the first fallacy appears, say: "That is the AI ref catching the exact quote and explaining the logic bug."
5. Stop speaking before the severity-three callout so the audience hears the ref.
6. Point briefly at the moving scoreboard.

### 1:50 to 2:30: Winner moment

Let the final verdict finish. Say:

> It did not just summarize the debate. It tracked each speaker, judged every completed turn, penalized the fallacies, and kept a score the audience could understand.

### 2:30 to 3:20: Technology

Say:

> Deepgram handles transcription, speaker diarization, and the referee voice. Redis stores the fallacy taxonomy as vectors and retrieves the most relevant logic patterns for each turn. Claude makes the grounded ruling and final verdict. The whole experience runs inside one Next.js app.

### 3:20 to 4:00: Close

Say:

> Most AI demos ask you to type into a box. Collina turns a real human moment into something everyone in the room can watch, understand, and play with. Big opinions go in. Scores, fallacies, and a little chaos come out.

End on the winner card. Do not restart unless a judge asks.

## Recorded debate script

Topic: Pineapple belongs on pizza.

Use two clearly different voices. Leave about one second of silence between turns. Speak naturally and do not rush.

### Human A

> Pineapple belongs on pizza because its sweetness balances salty ham, and its acidity cuts through rich cheese. Sweet and savory combinations work everywhere, from prosciutto and melon to honey-glazed ham.

### Human B

> Only someone with absolutely no taste would put fruit on pizza. People who order Hawaiian pizza clearly have unsophisticated palates.

### Human A

> Attacking my taste is not an argument. The flavor contrast still works, and examples from other dishes show that sweetness can balance salty, rich food.

### Human B

> If we allow pineapple, what comes next? Chocolate, gummy bears, breakfast cereal? Soon pizza will mean nothing and Italian cuisine will collapse completely.

### Human A

> Honestly, a lot of people enjoy it, and pizza is supposed to be fun. There is nothing sacred about a fixed topping list.

### Human B

> There is a practical problem. Warm pineapple releases water, which can make the crust soggy and weaken the structure of the slice.

### Human A

> What about mushrooms? They release water too, and nobody is trying to ban mushroom pizza.

### Human B

> Mushrooms can also make pizza wet, but that does not answer whether pineapple does. Drain the pineapple properly and the texture problem improves, but its sweetness is still a matter of preference.

## Recording checklist

- Record in a quiet room.
- Put both people the same distance from the microphone.
- Use distinct voices and consistent volume.
- Leave one second between turns for segmentation.
- Keep the clip between 70 and 100 seconds.
- Export MP3 or WAV.
- Name the final file `public/demo-debate.mp3` or `public/demo-debate.wav`.
- Run the complete clip through Deepgram before the event.

## Merge checklist with Evan

1. Pull the backend branch and resolve only intentional shared contract changes.
2. Confirm `Turn`, `Callout`, and `DebateSession` still match `lib/types.ts`.
3. Confirm the real client exports the same `startDebate` and `getVerdict` functions.
4. Create `.env.local` with the three required values.
5. Add the recorded clip to `public/`.
6. Run `npm run preflight` and verify it reports `REAL` mode.
7. Run `npm run check`.
8. Rehearse the complete clip at least three times.

## Pre-stage checklist

1. Plug the laptop into power.
2. Disable sleep and notification popups.
3. Confirm the presentation display resolution.
4. Run `npm run preflight`.
5. Run `npm run check`.
6. Start the app with `npm run dev`.
7. Open `http://localhost:3000`.
8. Press `F` and verify presentation mode.
9. Confirm sound is on and test one callout.
10. Restart the app and leave it on the setup screen.

## Fallback ladder

1. Primary: real recorded audio through Deepgram, Redis, and Claude.
2. If Redis fails: use the hardcoded fallacy taxonomy fallback.
3. If Deepgram TTS fails: Collina uses browser speech.
4. If the network or real pipeline fails: restore the mock implementation in `lib/debate-client.ts`, restart, and run the timed demo.
5. If presentation mode fails: use the browser window at 100 percent zoom.

The audience should always see the transcript, fallacy flags, scoreboard, and winner. Those are the non-negotiable moments.

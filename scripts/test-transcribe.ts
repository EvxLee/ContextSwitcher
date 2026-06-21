// scripts/test-transcribe.ts — run a real audio clip through Deepgram and print
// the diarized, segmented turns. Needs DEEPGRAM_API_KEY.
//   run: npm run test:transcribe -- ./samples/debate.wav
import "./_env";
import { transcribeClip } from "../lib/deepgram";
import { segmentTurns } from "../lib/segmentation";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npm run test:transcribe -- <path-to-audio-file>");
    process.exit(1);
  }

  console.log(`Transcribing ${filePath} via Deepgram (diarized)...`);
  const utterances = await transcribeClip(filePath);
  const turns = segmentTurns(utterances);

  console.log(`\n${utterances.length} utterances -> ${turns.length} turns:\n`);
  for (const t of turns) {
    console.log(
      `[${t.start.toFixed(1)}s–${t.end.toFixed(1)}s] Speaker ${t.speaker}: ${t.text}`
    );
  }

  const speakers = new Set(turns.map((t) => t.speaker));
  console.log(`\n${turns.length} turns across ${speakers.size} speaker(s): ${[...speakers].join(", ")}`);
  if (speakers.size < 2) {
    console.log("WARNING: only one speaker detected — check the clip has two distinct voices.");
  }
}

main().catch((err) => {
  console.error("Transcribe test failed:", err);
  process.exit(1);
});

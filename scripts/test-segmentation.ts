// scripts/test-segmentation.ts — unit test for live turn assembly (no keys needed).
//   run: npm run test:segmentation
import assert from "node:assert";
import { LiveTurnAssembler, type StreamWord } from "../lib/liveSegmentation";

const w = (word: string, speaker: number): StreamWord => ({ word, punctuated_word: word, speaker });

let pass = 0;
function check(name: string, fn: () => void) {
  fn();
  console.log(`PASS  ${name}`);
  pass++;
}

check("accumulates one speaker, no completion until change", () => {
  const a = new LiveTurnAssembler();
  assert.deepStrictEqual(a.addFinalWords([w("Pineapple", 0), w("rules", 0)]), []);
  assert.strictEqual(a.currentSpeaker(), "A");
  assert.strictEqual(a.currentText(), "Pineapple rules");
});

check("completes the prior turn when the speaker changes across messages", () => {
  const a = new LiveTurnAssembler();
  a.addFinalWords([w("Pineapple", 0), w("rules", 0)]);
  const completed = a.addFinalWords([w("No", 1), w("way", 1)]);
  assert.deepStrictEqual(completed, [{ speaker: "A", text: "Pineapple rules" }]);
  assert.strictEqual(a.currentSpeaker(), "B");
  assert.strictEqual(a.currentText(), "No way");
});

check("handles a speaker change within a single message", () => {
  const a = new LiveTurnAssembler();
  const completed = a.addFinalWords([w("hello", 0), w("good", 1), w("bye", 1)]);
  assert.deepStrictEqual(completed, [{ speaker: "A", text: "hello" }]);
  assert.strictEqual(a.currentText(), "good bye");
});

check("ignores an isolated one-word speaker wobble", () => {
  const a = new LiveTurnAssembler();
  const completed = a.addFinalWords([w("Pineapple", 0), w("really", 1), w("works", 0)]);
  assert.deepStrictEqual(completed, []);
  assert.strictEqual(a.currentSpeaker(), "A");
  assert.strictEqual(a.currentText(), "Pineapple really works");
});

check("preserves a one-word interjection when a pause confirms it", () => {
  const a = new LiveTurnAssembler();
  a.addFinalWords([w("I", 0), w("disagree", 0), w("No", 1)]);
  assert.deepStrictEqual(a.flushAll(), [
    { speaker: "A", text: "I disagree" },
    { speaker: "B", text: "No" },
  ]);
});

check("flush returns and clears the current turn", () => {
  const a = new LiveTurnAssembler();
  a.addFinalWords([w("done", 1)]);
  assert.deepStrictEqual(a.flush(), { speaker: "B", text: "done" });
  assert.strictEqual(a.flush(), null); // already flushed
});

check("ignores empty words", () => {
  const a = new LiveTurnAssembler();
  a.addFinalWords([{ word: "", speaker: 0 }, w("real", 0)]);
  assert.strictEqual(a.currentText(), "real");
});

console.log(`\nAll ${pass} live-segmentation tests passed.`);

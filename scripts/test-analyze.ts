// scripts/test-analyze.ts — accuracy harness for the analysis call.
//   run: npm run test:analyze   (needs ANTHROPIC_API_KEY + Redis running)
// The critical check is "not trigger-happy": clean turns MUST get zero fallacies.
import "./_env";
import { analyzeTurn } from "../lib/analyze";
import { closeRedis } from "../lib/redis";

const TOPIC = "Pineapple belongs on pizza.";

interface Case {
  label: string;
  text: string;
  previousTurnText?: string;
  expectClean: boolean; // true => MUST detect no fallacies
  expectType?: string; // a fallacy we expect to show up (loose check)
}

const cases: Case[] = [
  {
    label: "clean substantive point",
    text: "Pineapple's sweetness balances the salty ham and its acidity cuts the heavy cheese. Sweet-and-savory pairings like prosciutto and melon are a well-established culinary principle.",
    expectClean: true,
  },
  {
    label: "ad hominem",
    text: "Only a clueless idiot with no taste would ever put fruit on a pizza.",
    expectClean: false,
    expectType: "Ad hominem",
  },
  {
    label: "slippery slope",
    text: "If we allow pineapple, soon people will put gummy bears and chocolate on pizza and Italian cuisine will collapse entirely.",
    expectClean: false,
    expectType: "Slippery slope",
  },
  {
    label: "clean rebuttal",
    text: "Attacking my taste isn't an argument. Flavor contrast shows up in sweet-and-sour pork and honey-glazed ham, so it's a culinary principle, not just personal preference.",
    previousTurnText: "Only an idiot with no taste would put fruit on a pizza.",
    expectClean: true,
  },
  {
    label: "whataboutism",
    text: "Soggy crust? What about mushrooms? They release tons of water too and nobody is out here banning mushroom pizza.",
    previousTurnText: "Warm pineapple releases water and makes the crust soggy.",
    expectClean: false,
    expectType: "Whataboutism",
  },
];

async function main() {
  let falseFlags = 0;
  let typeHits = 0;
  let typeExpected = 0;

  for (const c of cases) {
    const a = await analyzeTurn({
      text: c.text,
      previousTurnText: c.previousTurnText,
      topic: TOPIC,
    });
    const names = a.fallacies.map((f) => `${f.type}(${f.severity})`).join(", ") || "none";

    let status = "ok";
    if (c.expectClean && a.fallacies.length > 0) {
      status = "FALSE FLAG";
      falseFlags++;
    }
    if (c.expectType) {
      typeExpected++;
      if (a.fallacies.some((f) => f.type.toLowerCase().includes(c.expectType!.toLowerCase().split(" ")[0]))) {
        typeHits++;
      } else {
        status = status === "ok" ? "missed-type" : status;
      }
    }

    console.log(
      `[${status.padEnd(10)}] ${c.label}\n   fallacies: ${names}  | strength ${a.argumentStrength} | delta ${a.pointDelta} | rebuttal ${a.isRebuttal}\n   retrieved: ${a.retrieved.join(", ")}\n`
    );
  }

  console.log(
    `False flags on clean turns: ${falseFlags} (must be 0). Expected fallacy detected: ${typeHits}/${typeExpected}.`
  );
  await closeRedis();
}

main().catch((err) => {
  console.error("Analyze test failed:", err);
  process.exit(1);
});

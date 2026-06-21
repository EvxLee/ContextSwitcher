import { DebateArena } from "@/components/DebateArena";

const DEMO_TOPIC = "Pineapple belongs on pizza.";

export default function Home() {
  return <DebateArena initialTopic={DEMO_TOPIC} />;
}

// lib/redis.ts — single shared Redis client. REDIS_URL is read at connect time so
// it picks up .env (and a future Redis Cloud URL) without a code change. Defaults
// to the local Docker instance.
import { createClient } from "redis";

let client: ReturnType<typeof createClient> | null = null;

export async function getRedis(): Promise<ReturnType<typeof createClient>> {
  if (client && client.isOpen) return client;
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  client = createClient({
    url,
    socket: {
      connectTimeout: 800,
      reconnectStrategy: false,
    },
  });
  client.on("error", (err) =>
    console.error("[redis] client error:", (err as Error).message)
  );
  await client.connect();
  return client;
}

export async function closeRedis(): Promise<void> {
  if (client && client.isOpen) await client.quit();
  client = null;
}

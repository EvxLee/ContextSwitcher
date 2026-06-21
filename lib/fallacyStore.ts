// lib/fallacyStore.ts — Redis vector search for the fallacy taxonomy (the Redis
// prize: "Redis Beyond Caching" = vector search + context retrieval / RAG).
//
//   seedFallacies()            -> embed each fallacy as multiple snippets, store in Redis
//   retrieveFallacies(text, k) -> KNN vector search for the k most relevant fallacies
//
// We embed the definition AND each example as separate vectors (RAG chunking) so a
// turn that matches an example phrase hits that vector directly instead of being
// averaged away. Retrieval dedupes snippets back to distinct fallacies.
//
// If Redis is unavailable, retrieveFallacies transparently falls back to an
// in-process cosine search over the same snippets, so the pipeline never breaks
// (CLAUDE.md cut-order item 2).
import type { FallacyDef } from "./types";
import { FALLACIES } from "./fallacies";
import { getRedis } from "./redis";
import {
  EMBEDDING_DIM,
  cosineSim,
  embed,
  embedMany,
  toFloat32Buffer,
} from "./embeddings";

const INDEX = "idx:fallacies";
const PREFIX = "fallacy:";

export interface RetrievedFallacy extends FallacyDef {
  score: number; // cosine similarity in [0,1], higher = more relevant
}

function addLexicalCandidates(
  text: string,
  candidates: RetrievedFallacy[],
  k: number
): RetrievedFallacy[] {
  const cueNames: string[] = [];
  if (/\bwhat\s+about\b/i.test(text)) cueNames.push("Whataboutism");

  for (const name of cueNames.reverse()) {
    const existingIndex = candidates.findIndex((candidate) => candidate.name.startsWith(name));
    if (existingIndex >= 0) {
      const [existing] = candidates.splice(existingIndex, 1);
      candidates.unshift(existing);
      continue;
    }
    const fallacy = FALLACIES.find((item) => item.name.startsWith(name));
    if (fallacy) candidates.unshift({ ...fallacy, score: 1 });
  }
  return candidates.slice(0, k);
}

// Snippets we embed per fallacy: the definition line plus each example phrase.
function fallacySnippets(f: FallacyDef): string[] {
  return [`${f.name}. ${f.definition}`, ...f.examples];
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function createIndex(
  redis: Awaited<ReturnType<typeof getRedis>>
): Promise<void> {
  await redis.ft.create(
    INDEX,
    {
      name: { type: "TEXT" },
      definition: { type: "TEXT" },
      embedding: {
        type: "VECTOR",
        ALGORITHM: "FLAT",
        TYPE: "FLOAT32",
        DIM: EMBEDDING_DIM,
        DISTANCE_METRIC: "COSINE",
      },
    },
    { ON: "HASH", PREFIX }
  );
}

// Clean-slate seed: drop the index + old keys, then embed every snippet and store
// it as a Redis hash. Returns the number of distinct fallacies seeded.
export async function seedFallacies(): Promise<number> {
  const redis = await getRedis();

  try {
    await redis.ft.dropIndex(INDEX);
  } catch {
    // index didn't exist yet
  }
  const stale = await redis.keys(PREFIX + "*");
  if (stale.length) await redis.del(stale);

  await createIndex(redis);

  const writes: Promise<unknown>[] = [];
  for (const f of FALLACIES) {
    const snippets = fallacySnippets(f);
    const vectors = await embedMany(snippets);
    snippets.forEach((_, i) => {
      writes.push(
        redis.hSet(`${PREFIX}${slug(f.name)}:${i}`, {
          name: f.name,
          definition: f.definition,
          examples: JSON.stringify(f.examples),
          embedding: toFloat32Buffer(vectors[i]),
        })
      );
    });
  }
  await Promise.all(writes);
  return FALLACIES.length;
}

// Top-k most relevant fallacies for a turn, via Redis KNN over snippet vectors,
// deduped to distinct fallacies. Falls back to in-process cosine if Redis errors.
export async function retrieveFallacies(
  text: string,
  k = 4
): Promise<RetrievedFallacy[]> {
  try {
    const redis = await getRedis();
    const blob = toFloat32Buffer(await embed(text));
    const res = await redis.ft.search(
      INDEX,
      `*=>[KNN ${k * 4} @embedding $BLOB AS score]`,
      {
        PARAMS: { BLOB: blob },
        SORTBY: { BY: "score", DIRECTION: "ASC" }, // COSINE distance: smaller = closer
        DIALECT: 2,
        RETURN: ["name", "definition", "examples", "score"],
      }
    );

    const best = new Map<string, RetrievedFallacy>();
    for (const doc of res.documents) {
      const name = String(doc.value.name);
      const score = 1 - Number(doc.value.score); // distance -> similarity
      const existing = best.get(name);
      if (!existing || score > existing.score) {
        best.set(name, {
          name,
          definition: String(doc.value.definition),
          examples: JSON.parse(String(doc.value.examples ?? "[]")),
          score,
        });
      }
    }
    return addLexicalCandidates(
      text,
      [...best.values()].sort((a, b) => b.score - a.score),
      k
    );
  } catch (err) {
    console.warn(
      "[fallacyStore] Redis retrieval failed, using in-process fallback:",
      (err as Error).message
    );
    return localFallback(text, k);
  }
}

// In-process vector search over the inline taxonomy snippets (no Redis needed).
let cachedSnippets: { fallacy: FallacyDef; vec: number[] }[] | null = null;
async function localFallback(
  text: string,
  k: number
): Promise<RetrievedFallacy[]> {
  if (!cachedSnippets) {
    cachedSnippets = [];
    for (const f of FALLACIES) {
      const vecs = await embedMany(fallacySnippets(f));
      for (const vec of vecs) cachedSnippets.push({ fallacy: f, vec });
    }
  }
  const q = await embed(text);
  const best = new Map<string, RetrievedFallacy>();
  for (const { fallacy, vec } of cachedSnippets) {
    const score = cosineSim(q, vec);
    const existing = best.get(fallacy.name);
    if (!existing || score > existing.score) {
      best.set(fallacy.name, { ...fallacy, score });
    }
  }
  return addLexicalCandidates(
    text,
    [...best.values()].sort((a, b) => b.score - a.score),
    k
  );
}

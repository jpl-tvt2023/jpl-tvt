// FPL API Cache
// Caches FPL data in Upstash Redis to avoid hitting rate limits

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const CACHE_TTL = 60 * 60 * 24; // 24 hours

interface CachedScore {
  points: number;
  transferHits: number;
  netScore: number;
  cachedAt: string;
}

/**
 * Get Redis key for a team's gameweek score
 */
function getKey(fplId: string, gameweek: number): string {
  return `fpl:gw${gameweek}:${fplId}`;
}

/**
 * Get cached score for a team in a gameweek
 */
export async function getCachedScore(
  fplId: string,
  gameweek: number
): Promise<CachedScore | null> {
  const data = await redis.get<CachedScore>(getKey(fplId, gameweek));
  return data || null;
}

/**
 * Set cached score for a team in a gameweek
 */
export async function setCachedScore(
  fplId: string,
  gameweek: number,
  score: { points: number; transferHits: number; netScore: number }
): Promise<void> {
  const value: CachedScore = {
    ...score,
    cachedAt: new Date().toISOString(),
  };
  await redis.set(getKey(fplId, gameweek), value, { ex: CACHE_TTL });
}

/**
 * Check if all scores for a gameweek are cached
 */
export async function isGameweekFullyCached(
  fplIds: string[],
  gameweek: number
): Promise<boolean> {
  if (fplIds.length === 0) return true;
  const keys = fplIds.map((id) => getKey(id, gameweek));
  const pipeline = redis.pipeline();
  for (const key of keys) {
    pipeline.exists(key);
  }
  const results = await pipeline.exec<number[]>();
  return results.every((exists) => exists === 1);
}

/**
 * Get all cached scores for a gameweek
 * Returns object with keys like "fplId_gwN" for backwards compatibility
 */
export async function getAllCachedScores(
  gameweek: number
): Promise<Record<string, CachedScore>> {
  const prefix = `fpl:gw${gameweek}:`;
  const result: Record<string, CachedScore> = {};

  let cursor = "0";
  do {
    const res = await redis.scan(cursor, { match: `${prefix}*`, count: 100 });
    cursor = res[0];
    const keys = res[1];

    if (keys.length > 0) {
      const pipeline = redis.pipeline();
      for (const key of keys) {
        pipeline.get(key);
      }
      const values = await pipeline.exec<(CachedScore | null)[]>();
      for (let i = 0; i < keys.length; i++) {
        if (values[i]) {
          // Convert key from "fpl:gw5:12345" to "12345_gw5" for backwards compatibility
          const fplId = keys[i].slice(prefix.length);
          result[`${fplId}_gw${gameweek}`] = values[i]!;
        }
      }
    }
  } while (cursor !== "0");

  return result;
}

/**
 * Clear cache for a specific gameweek (for re-fetching)
 */
export async function clearGameweekCache(gameweek: number): Promise<void> {
  const prefix = `fpl:gw${gameweek}:`;
  let cursor = "0";
  do {
    const res = await redis.scan(cursor, { match: `${prefix}*`, count: 100 });
    cursor = res[0];
    const keys = res[1];
    if (keys.length > 0) {
      const pipeline = redis.pipeline();
      for (const key of keys) {
        pipeline.del(key);
      }
      await pipeline.exec();
    }
  } while (cursor !== "0");
}

/**
 * Get cache stats
 */
export async function getCacheStats(): Promise<{ gameweek: number; entries: number }[]> {
  const stats: { gameweek: number; entries: number }[] = [];

  for (let gw = 1; gw <= 38; gw++) {
    const prefix = `fpl:gw${gw}:`;
    let count = 0;
    let cursor = "0";
    do {
      const res = await redis.scan(cursor, { match: `${prefix}*`, count: 100 });
      cursor = res[0];
      count += res[1].length;
    } while (cursor !== "0");

    if (count > 0) {
      stats.push({ gameweek: gw, entries: count });
    }
  }

  return stats;
}

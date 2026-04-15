import fs from 'node:fs';
import path from 'node:path';
import { FeedbackItem } from './types';

// --- Cache configuration ---
const CACHE_DIR = path.join(process.cwd(), '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'feedback-cache.json');
const CACHE_TTL_MS = 3_600_000; // 1 hour

// --- L2 cache file shape ---
interface CacheFilePayload {
  items: FeedbackItem[];
  lastRefreshed: string;
  cachedAt: string; // ISO 8601 timestamp for TTL checks
}

// --- L1: in-memory cache (fast, resets on restart) ---
let feedbackData: FeedbackItem[] = [];
let lastRefreshed: string | null = null;

// ---------------------------------------------------------------------------
// File-based (L2) helpers — every call is wrapped in try/catch so a broken
// cache file never takes down the app.
// ---------------------------------------------------------------------------

function ensureCacheDir(): void {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch {
    // Directory may already exist or be unwritable — either way, continue
  }
}

function writeCacheFile(payload: CacheFilePayload): void {
  try {
    ensureCacheDir();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch {
    // Graceful degradation — in-memory cache still works
  }
}

function readCacheFile(): CacheFilePayload | null {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    const parsed: CacheFilePayload = JSON.parse(raw);

    // Validate required fields before trusting the file
    if (!Array.isArray(parsed.items) || !parsed.lastRefreshed || !parsed.cachedAt) {
      return null;
    }

    // Check TTL — reject stale cache
    const cachedTime = new Date(parsed.cachedAt).getTime();
    if (isNaN(cachedTime)) {
      return null;
    }
    const age = Date.now() - cachedTime;
    if (age > CACHE_TTL_MS) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API — same signature as before so callers need zero changes
// ---------------------------------------------------------------------------

export function setData(items: FeedbackItem[]): void {
  const now = new Date().toISOString();

  // L1: update in-memory
  feedbackData = items;
  lastRefreshed = now;

  // L2: persist to file
  writeCacheFile({ items, lastRefreshed: now, cachedAt: now });
}

export function getData(): { items: FeedbackItem[]; lastRefreshed: string | null } {
  // L1 hit — return immediately (lastRefreshed !== null means setData was called or L2 was hydrated)
  if (lastRefreshed !== null) {
    return { items: feedbackData, lastRefreshed };
  }

  // L1 miss — try hydrating from L2 file cache
  const cached = readCacheFile();
  if (cached) {
    feedbackData = cached.items;
    lastRefreshed = cached.lastRefreshed;
    return { items: feedbackData, lastRefreshed };
  }

  // Both caches empty or expired — caller will need to trigger a refresh
  return { items: [], lastRefreshed: null };
}

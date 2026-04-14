'use server';

import { getData, setData } from '@/lib/store';
import { fetchAllSources } from '@/lib/sources';
import { classifyFeedback } from '@/lib/analysis/classifier';
import { FeedbackItem } from '@/lib/types';

export async function refreshFeedback(): Promise<{
  itemCount: number;
  lastRefreshed: string;
}> {
  // 1. Fetch from all sources
  const rawItems = await fetchAllSources();

  // 2. Classify (LLM or rule-based fallback)
  const classified = await classifyFeedback(rawItems);

  // 3. Store in memory
  setData(classified);

  return {
    itemCount: classified.length,
    lastRefreshed: new Date().toISOString(),
  };
}

export async function getFeedback(): Promise<{
  items: FeedbackItem[];
  lastRefreshed: string | null;
}> {
  return getData();
}

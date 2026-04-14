import { FeedbackItem } from '../types';
import { fetchCsvFeedback } from './csv';
import { fetchHackerNewsFeedback } from './hackernews';
import { fetchGitHubFeedback } from './github';
import { fetchRedditFeedback } from './reddit';

export async function fetchAllSources(): Promise<FeedbackItem[]> {
  const results = await Promise.allSettled([
    fetchCsvFeedback(),
    fetchHackerNewsFeedback(),
    fetchGitHubFeedback(),
    fetchRedditFeedback(),
  ]);

  const items: FeedbackItem[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      items.push(...result.value);
    } else {
      console.error('Source fetch failed:', result.reason);
    }
  }

  console.log(`Fetched ${items.length} feedback items from ${results.filter(r => r.status === 'fulfilled').length} sources`);
  return items;
}

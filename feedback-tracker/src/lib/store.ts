import { FeedbackItem } from './types';

// Module-level variable — persists across requests within the same Node.js process, resets on restart
let feedbackData: FeedbackItem[] = [];
let lastRefreshed: string | null = null;

export function setData(items: FeedbackItem[]) {
  feedbackData = items;
  lastRefreshed = new Date().toISOString();
}

export function getData(): { items: FeedbackItem[]; lastRefreshed: string | null } {
  return { items: feedbackData, lastRefreshed };
}

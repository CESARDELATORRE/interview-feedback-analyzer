import { FeedbackItem } from '../types';

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    created_utc: number;
    permalink: string;
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
  };
}

export async function fetchRedditFeedback(): Promise<FeedbackItem[]> {
  const url =
    'https://www.reddit.com/r/vscode/search.json?q=copilot+OR+ai&sort=relevance&limit=50&restrict_sr=on&t=year';

  const response = await fetch(url, {
    headers: { 'User-Agent': 'FeedbackAnalyzer/1.0' },
  });

  if (!response.ok) {
    console.error(`Reddit API error: ${response.status}`);
    return [];
  }

  const data: RedditResponse = await response.json();

  return data.data.children
    .filter((post) => post.data.selftext.length > 10 || post.data.title.length > 20)
    .map((post) => ({
      id: `reddit:${post.data.id}`,
      source: 'reddit' as const,
      sourceUrl: `https://reddit.com${post.data.permalink}`,
      createdAt: new Date(post.data.created_utc * 1000).toISOString(),
      text: `${post.data.title}. ${post.data.selftext}`.substring(0, 1000),
      title: post.data.title,
      themes: [],
      sentiment: 'neutral' as const,
      isFeatureRequest: false,
    }));
}

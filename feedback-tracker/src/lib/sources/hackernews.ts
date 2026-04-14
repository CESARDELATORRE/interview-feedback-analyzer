import { FeedbackItem } from '../types';

interface HNHit {
  objectID: string;
  comment_text?: string;
  story_title?: string;
  created_at: string;
  story_url?: string;
}

interface HNResponse {
  hits: HNHit[];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function fetchHackerNewsFeedback(): Promise<FeedbackItem[]> {
  const query = encodeURIComponent('"VS Code" OR "GitHub Copilot" OR "vscode copilot"');
  const url = `https://hn.algolia.com/api/v1/search?query=${query}&tags=comment&hitsPerPage=100`;

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`HN API error: ${response.status}`);
    return [];
  }

  const data: HNResponse = await response.json();

  return data.hits
    .filter((hit) => hit.comment_text && hit.comment_text.length > 20)
    .map((hit) => ({
      id: `hackernews:${hit.objectID}`,
      source: 'hackernews' as const,
      sourceUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      createdAt: hit.created_at,
      text: stripHtml(hit.comment_text || ''),
      title: hit.story_title || undefined,
      themes: [],
      sentiment: 'neutral' as const,
      isFeatureRequest: false,
    }));
}

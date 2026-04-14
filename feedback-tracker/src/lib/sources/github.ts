import { FeedbackItem } from '../types';

interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  created_at: string;
  html_url: string;
  labels: Array<{ name: string }>;
}

export async function fetchGitHubFeedback(): Promise<FeedbackItem[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Search for AI/Copilot-related issues in the vscode repo
  const searchQuery = encodeURIComponent('repo:microsoft/vscode copilot OR "AI" OR "agent mode" in:title,body');
  const url = `https://api.github.com/search/issues?q=${searchQuery}&per_page=50&sort=updated&order=desc`;

  const response = await fetch(url, { headers });
  if (!response.ok) {
    console.error(`GitHub API error: ${response.status}`);
    return [];
  }

  const data = await response.json();
  const issues: GitHubIssue[] = data.items || [];

  return issues.map((issue) => {
    const body = issue.body ? issue.body.substring(0, 1000) : '';
    return {
      id: `github-issues:${issue.number}`,
      source: 'github-issues' as const,
      sourceUrl: issue.html_url,
      createdAt: issue.created_at,
      text: `${issue.title}. ${body}`,
      title: issue.title,
      themes: [],
      sentiment: 'neutral' as const,
      isFeatureRequest: false,
    };
  });
}

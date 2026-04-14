// Core domain types for the VS Code AI Feedback Analyzer

export type FeedbackSource = 'csv-survey' | 'hackernews' | 'github-issues' | 'reddit';
export type SentimentLabel = 'positive' | 'neutral' | 'negative';
export type ThemeLabel =
  | 'agent-mode'
  | 'code-completion'
  | 'performance'
  | 'model-quality'
  | 'usability'
  | 'feature-request'
  | 'other';

export interface FeedbackItem {
  id: string;                          // "{source}:{sourceId}"
  source: FeedbackSource;
  sourceUrl?: string;
  createdAt?: string;                  // ISO 8601
  text: string;                        // Feedback content
  title?: string;

  // CSV-specific structured data
  npsScore?: number;                   // 0-10
  ratings?: Record<string, number>;    // e.g., { agentMode: 5, performance: 3 }

  // AI-classified fields (populated after analysis)
  themes: ThemeLabel[];
  sentiment: SentimentLabel;
  isFeatureRequest: boolean;
}

export interface FeedbackStore {
  items: FeedbackItem[];
  lastRefreshed: string | null;
  isLoading: boolean;
}

export const THEME_LABELS: Record<ThemeLabel, string> = {
  'agent-mode': 'Agent Mode',
  'code-completion': 'Code Completion',
  'performance': 'Performance',
  'model-quality': 'Model Quality',
  'usability': 'Usability',
  'feature-request': 'Feature Request',
  'other': 'Other',
};

export const SOURCE_LABELS: Record<FeedbackSource, string> = {
  'csv-survey': 'CSV Survey',
  'hackernews': 'Hacker News',
  'github-issues': 'GitHub Issues',
  'reddit': 'Reddit',
};

export const SENTIMENT_COLORS: Record<SentimentLabel, string> = {
  positive: '#22c55e',
  neutral: '#f59e0b',
  negative: '#ef4444',
};

export const SOURCE_COLORS: Record<FeedbackSource, string> = {
  'csv-survey': '#6366f1',
  'hackernews': '#f97316',
  'github-issues': '#8b5cf6',
  'reddit': '#ef4444',
};

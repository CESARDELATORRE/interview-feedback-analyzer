import { FeedbackItem, ThemeLabel, SentimentLabel } from '../types';

const THEME_KEYWORDS: Record<ThemeLabel, string[]> = {
  'agent-mode': ['agent', 'agentic', 'autonomous', 'agent mode'],
  'code-completion': ['completion', 'autocomplete', 'suggestion', 'boilerplate', 'inline', 'copilot suggest', 'next edit'],
  'performance': ['slow', 'fast', 'latency', 'speed', 'performance', 'lag', 'quota', 'token', 'resource', 'memory'],
  'model-quality': ['model', 'gpt', 'claude', 'accuracy', 'smart', 'hallucin', 'wrong answer', 'incorrect'],
  'usability': ['easy', 'hard', 'intuitive', 'confusing', 'ui', 'ux', 'workflow', 'discoverability', 'configure'],
  'feature-request': ['wish', 'want', 'would like', 'please add', 'should have', 'would be nice', 'request'],
  'other': [],
};

const POSITIVE_WORDS = ['great', 'love', 'excellent', 'awesome', 'amazing', 'fantastic', 'helpful', 'useful', 'good', 'wonderful', 'brilliant', 'perfect', 'impressive', 'powerful', 'revolutionary', 'best'];
const NEGATIVE_WORDS = ['slow', 'broken', 'frustrating', 'unusable', 'error', 'fail', 'bad', 'terrible', 'awful', 'annoying', 'buggy', 'poor', 'worse', 'hate', 'useless', 'disappointing', 'horrible'];

function classifyThemes(text: string): ThemeLabel[] {
  const lower = text.toLowerCase();
  const matched: ThemeLabel[] = [];

  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS) as [ThemeLabel, string[]][]) {
    if (theme === 'other') continue;
    if (keywords.some((kw) => lower.includes(kw))) {
      matched.push(theme);
    }
  }

  return matched.length > 0 ? matched : ['other'];
}

function classifySentiment(text: string): SentimentLabel {
  const lower = text.toLowerCase();
  let posCount = 0;
  let negCount = 0;

  for (const word of POSITIVE_WORDS) {
    if (lower.includes(word)) posCount++;
  }
  for (const word of NEGATIVE_WORDS) {
    if (lower.includes(word)) negCount++;
  }

  if (posCount > negCount) return 'positive';
  if (negCount > posCount) return 'negative';
  return 'neutral';
}

function detectFeatureRequest(text: string): boolean {
  const lower = text.toLowerCase();
  const featureKeywords = ['wish', 'want', 'would like', 'please add', 'should have', 'would be nice', 'feature request', 'suggestion'];
  return featureKeywords.some((kw) => lower.includes(kw));
}

export function classifyWithRules(items: FeedbackItem[]): FeedbackItem[] {
  return items.map((item) => ({
    ...item,
    themes: classifyThemes(item.text),
    sentiment: classifySentiment(item.text),
    isFeatureRequest: detectFeatureRequest(item.text),
  }));
}

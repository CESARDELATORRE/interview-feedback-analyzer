import { AzureOpenAI } from 'openai';
import { FeedbackItem, ThemeLabel, SentimentLabel } from '../types';

const VALID_THEMES: ThemeLabel[] = ['agent-mode', 'code-completion', 'performance', 'model-quality', 'usability', 'feature-request', 'other'];
const VALID_SENTIMENTS: SentimentLabel[] = ['positive', 'neutral', 'negative'];

interface ClassificationResult {
  themes: ThemeLabel[];
  sentiment: SentimentLabel;
  isFeatureRequest: boolean;
}

const SYSTEM_PROMPT = `You are a feedback classifier for VS Code AI features (GitHub Copilot, agent mode, code completion, etc.).

For each feedback item, classify:
- themes: one or more from [agent-mode, code-completion, performance, model-quality, usability, feature-request, other]
- sentiment: one of [positive, neutral, negative]
- isFeatureRequest: boolean

Respond ONLY with a JSON array matching the input order. Each element: {"themes": [...], "sentiment": "...", "isFeatureRequest": true/false}
No other text.`;

function buildUserPrompt(items: FeedbackItem[]): string {
  const entries = items.map((item, i) => `[${i}] ${item.text.substring(0, 500)}`);
  return `Classify these ${items.length} feedback items:\n\n${entries.join('\n\n')}`;
}

function validateResult(result: ClassificationResult): ClassificationResult {
  return {
    themes: result.themes?.filter(t => VALID_THEMES.includes(t)) || ['other'],
    sentiment: VALID_SENTIMENTS.includes(result.sentiment) ? result.sentiment : 'neutral',
    isFeatureRequest: typeof result.isFeatureRequest === 'boolean' ? result.isFeatureRequest : false,
  };
}

export async function classifyWithLLM(items: FeedbackItem[]): Promise<FeedbackItem[]> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

  if (!endpoint || !apiKey || !deployment) {
    throw new Error('Azure OpenAI not configured');
  }

  const client = new AzureOpenAI({
    endpoint,
    apiKey,
    deployment,
    apiVersion: '2024-08-01-preview',
  });

  const BATCH_SIZE = 25;
  const classified = [...items];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    try {
      const response = await client.chat.completions.create({
        model: deployment,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(batch) },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) continue;

      // Extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) continue;

      const results: ClassificationResult[] = JSON.parse(jsonMatch[0]);

      for (let j = 0; j < batch.length && j < results.length; j++) {
        const validated = validateResult(results[j]);
        classified[i + j] = {
          ...classified[i + j],
          themes: validated.themes.length > 0 ? validated.themes : ['other'],
          sentiment: validated.sentiment,
          isFeatureRequest: validated.isFeatureRequest,
        };
      }
    } catch (error) {
      console.error(`LLM batch ${i}-${i + BATCH_SIZE} failed:`, error);
      // Items in this batch keep their defaults — will be caught by rule-based fallback
    }
  }

  return classified;
}

export function isLLMConfigured(): boolean {
  return !!(
    process.env.AZURE_OPENAI_ENDPOINT &&
    process.env.AZURE_OPENAI_API_KEY &&
    process.env.AZURE_OPENAI_DEPLOYMENT_NAME
  );
}

import { FeedbackItem } from '../types';
import { classifyWithRules } from './rule-classifier';
import { classifyWithLLM, isLLMConfigured } from './llm-classifier';

export async function classifyFeedback(items: FeedbackItem[]): Promise<FeedbackItem[]> {
  if (isLLMConfigured()) {
    try {
      console.log('Using Azure OpenAI LLM for classification...');
      return await classifyWithLLM(items);
    } catch (error) {
      console.warn('LLM classification failed, falling back to rule-based:', error);
    }
  } else {
    console.log('No Azure OpenAI key configured — using rule-based classification');
  }

  return classifyWithRules(items);
}

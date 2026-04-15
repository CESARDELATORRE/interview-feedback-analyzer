import { cn } from '@/lib/utils';
import { SentimentLabel, SENTIMENT_COLORS } from '@/lib/types';

const sentimentEmoji: Record<SentimentLabel, string> = {
  positive: '😊',
  neutral: '😐',
  negative: '😤',
};

export function SentimentBadge({ sentiment }: { sentiment: SentimentLabel }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        sentiment === 'positive' && 'bg-emerald-100 text-emerald-700',
        sentiment === 'neutral' && 'bg-amber-100 text-amber-700',
        sentiment === 'negative' && 'bg-red-100 text-red-700'
      )}
    >
      {sentimentEmoji[sentiment]} {sentiment}
    </span>
  );
}

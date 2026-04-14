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
        sentiment === 'positive' && 'bg-emerald-500/20 text-emerald-300',
        sentiment === 'neutral' && 'bg-amber-500/20 text-amber-300',
        sentiment === 'negative' && 'bg-red-500/20 text-red-300'
      )}
    >
      {sentimentEmoji[sentiment]} {sentiment}
    </span>
  );
}

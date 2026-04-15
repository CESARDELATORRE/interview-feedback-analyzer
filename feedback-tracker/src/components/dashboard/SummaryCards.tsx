import { FeedbackItem, FeedbackSource, SOURCE_LABELS } from '@/lib/types';
import { BarChart3, TrendingUp, MessageSquare, Star } from 'lucide-react';

interface SummaryCardsProps {
  items: FeedbackItem[];
}

export function SummaryCards({ items }: SummaryCardsProps) {
  const totalCount = items.length;

  // Average NPS from CSV items
  const csvItems = items.filter((i) => i.source === 'csv-survey' && i.npsScore != null);
  const avgNps = csvItems.length > 0
    ? (csvItems.reduce((sum, i) => sum + (i.npsScore || 0), 0) / csvItems.length).toFixed(1)
    : 'N/A';

  // Feature requests
  const featureRequests = items.filter((i) => i.isFeatureRequest).length;

  // Sentiment split
  const positive = items.filter((i) => i.sentiment === 'positive').length;
  const neutral = items.filter((i) => i.sentiment === 'neutral').length;
  const negative = items.filter((i) => i.sentiment === 'negative').length;

  // Source breakdown
  const sources = new Set(items.map((i) => i.source));

  const cards = [
    {
      title: 'Total Feedback',
      value: totalCount.toString(),
      subtitle: `${sources.size} source${sources.size !== 1 ? 's' : ''}`,
      icon: MessageSquare,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      title: 'Avg NPS Score',
      value: avgNps === 'N/A' ? avgNps : `${avgNps}/10`,
      subtitle: `${csvItems.length} survey responses`,
      icon: Star,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Feature Requests',
      value: featureRequests.toString(),
      subtitle: `${totalCount > 0 ? ((featureRequests / totalCount) * 100).toFixed(0) : 0}% of total`,
      icon: TrendingUp,
      color: 'text-lime-600',
      bg: 'bg-lime-50',
    },
    {
      title: 'Sentiment Split',
      value: `${totalCount > 0 ? ((positive / totalCount) * 100).toFixed(0) : 0}% positive`,
      subtitle: `👍 ${positive}  😐 ${neutral}  👎 ${negative}`,
      icon: BarChart3,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">{card.title}</span>
            <div className={`p-2 rounded-lg ${card.bg}`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{card.value}</p>
          <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
}

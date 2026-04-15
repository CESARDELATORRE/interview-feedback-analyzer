'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { FeedbackItem, SENTIMENT_COLORS } from '@/lib/types';
import { format, parseISO } from 'date-fns';

interface SentimentTimelineProps {
  items: FeedbackItem[];
}

export function SentimentTimeline({ items }: SentimentTimelineProps) {
  // Only items with timestamps (exclude CSV)
  const timestamped = items.filter((i) => i.createdAt && i.source !== 'csv-survey');

  if (timestamped.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-600 mb-4">Sentiment Over Time</h3>
        <p className="text-gray-500 text-sm text-center py-10">
          No timestamped data available. CSV survey data has no timestamps.
        </p>
      </div>
    );
  }

  // Group by month
  const monthly: Record<string, { positive: number; neutral: number; negative: number }> = {};

  for (const item of timestamped) {
    const month = format(parseISO(item.createdAt!), 'yyyy-MM');
    if (!monthly[month]) {
      monthly[month] = { positive: 0, neutral: 0, negative: 0 };
    }
    monthly[month][item.sentiment]++;
  }

  const data = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, counts]) => ({
      month: format(parseISO(`${month}-01`), 'MMM yyyy'),
      ...counts,
    }));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-sm font-medium text-gray-600 mb-1">Sentiment Over Time</h3>
      <p className="text-xs text-gray-500 mb-4">Timestamped sources only (HN, GitHub, Reddit). CSV excluded.</p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 10, right: 10 }}>
            <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} />
            <YAxis stroke="#9ca3af" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                color: '#374151',
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="positive" name="Positive" stroke={SENTIMENT_COLORS.positive} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="neutral" name="Neutral" stroke={SENTIMENT_COLORS.neutral} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="negative" name="Negative" stroke={SENTIMENT_COLORS.negative} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { FeedbackItem, FeedbackSource, SOURCE_LABELS, SENTIMENT_COLORS } from '@/lib/types';

interface SentimentBySourceProps {
  items: FeedbackItem[];
}

export function SentimentBySource({ items }: SentimentBySourceProps) {
  const sourceData: Record<string, { positive: number; neutral: number; negative: number }> = {};

  for (const item of items) {
    const label = SOURCE_LABELS[item.source];
    if (!sourceData[label]) {
      sourceData[label] = { positive: 0, neutral: 0, negative: 0 };
    }
    sourceData[label][item.sentiment]++;
  }

  const data = Object.entries(sourceData).map(([source, counts]) => ({
    source,
    ...counts,
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-sm font-medium text-gray-600 mb-4">Sentiment by Source</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 10, right: 10 }}>
            <XAxis dataKey="source" stroke="#9ca3af" fontSize={12} />
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
            <Bar dataKey="positive" name="Positive" fill={SENTIMENT_COLORS.positive} radius={[4, 4, 0, 0]} />
            <Bar dataKey="neutral" name="Neutral" fill={SENTIMENT_COLORS.neutral} radius={[4, 4, 0, 0]} />
            <Bar dataKey="negative" name="Negative" fill={SENTIMENT_COLORS.negative} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

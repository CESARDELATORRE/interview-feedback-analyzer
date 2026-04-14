'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FeedbackItem, SENTIMENT_COLORS, SentimentLabel } from '@/lib/types';

interface SentimentChartProps {
  items: FeedbackItem[];
}

export function SentimentChart({ items }: SentimentChartProps) {
  const counts: Record<SentimentLabel, number> = { positive: 0, neutral: 0, negative: 0 };
  for (const item of items) {
    counts[item.sentiment]++;
  }

  const data = [
    { name: 'Positive', value: counts.positive, fill: SENTIMENT_COLORS.positive },
    { name: 'Neutral', value: counts.neutral, fill: SENTIMENT_COLORS.neutral },
    { name: 'Negative', value: counts.negative, fill: SENTIMENT_COLORS.negative },
  ].filter((d) => d.value > 0);

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-4">Sentiment Distribution</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#e5e7eb',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

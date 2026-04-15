'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { FeedbackItem } from '@/lib/types';

const RATING_LABELS: Record<string, string> = {
  agentMode: 'Agent Mode',
  codeCompletion: 'Code Completion',
  chatEdit: 'Chat & Edit',
  nextEditSuggestions: 'Next Edit',
  modelChoice: 'Model Choice',
  enterpriseFeatures: 'Enterprise',
  performance: 'Performance',
  easeOfUse: 'Ease of Use',
  overallSatisfaction: 'Overall',
};

interface RatingDistributionsProps {
  items: FeedbackItem[];
}

export function RatingDistributions({ items }: RatingDistributionsProps) {
  const csvItems = items.filter((i) => i.source === 'csv-survey' && i.ratings);

  if (csvItems.length === 0) {
    return null;
  }

  // Calculate average for each rating
  const ratingKeys = Object.keys(csvItems[0].ratings || {});
  const averages = ratingKeys.map((key) => {
    const values = csvItems
      .map((i) => i.ratings?.[key])
      .filter((v): v is number => v != null && !isNaN(v));
    const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    return {
      name: RATING_LABELS[key] || key,
      average: parseFloat(avg.toFixed(2)),
    };
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-sm font-medium text-gray-600 mb-1">Survey Rating Averages</h3>
      <p className="text-xs text-gray-500 mb-4">From {csvItems.length} CSV survey responses (1-5 scale)</p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={averages} margin={{ left: 10, right: 20 }}>
            <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} angle={-25} textAnchor="end" height={60} />
            <YAxis stroke="#9ca3af" fontSize={12} domain={[0, 5]} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                color: '#374151',
              }}
              formatter={(value) => [`${Number(value).toFixed(2)} / 5`, 'Average']}
            />
            <Bar dataKey="average" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

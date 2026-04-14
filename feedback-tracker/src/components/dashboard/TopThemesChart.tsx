'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { FeedbackItem, ThemeLabel, THEME_LABELS } from '@/lib/types';

const THEME_CHART_COLORS: Record<ThemeLabel, string> = {
  'agent-mode': '#8b5cf6',
  'code-completion': '#3b82f6',
  'performance': '#f97316',
  'model-quality': '#06b6d4',
  'usability': '#ec4899',
  'feature-request': '#84cc16',
  'other': '#6b7280',
};

interface TopThemesChartProps {
  items: FeedbackItem[];
}

export function TopThemesChart({ items }: TopThemesChartProps) {
  const themeCounts: Record<string, number> = {};
  for (const item of items) {
    for (const theme of item.themes) {
      themeCounts[theme] = (themeCounts[theme] || 0) + 1;
    }
  }

  const data = Object.entries(themeCounts)
    .map(([theme, count]) => ({
      theme: THEME_LABELS[theme as ThemeLabel] || theme,
      themeKey: theme as ThemeLabel,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-4">Top Themes</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 30, right: 20 }}>
            <XAxis type="number" stroke="#6b7280" fontSize={12} />
            <YAxis
              type="category"
              dataKey="theme"
              stroke="#6b7280"
              fontSize={12}
              width={110}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#e5e7eb',
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell key={entry.themeKey} fill={THEME_CHART_COLORS[entry.themeKey] || '#6b7280'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

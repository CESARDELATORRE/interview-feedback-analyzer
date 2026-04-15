'use client';

import { useState, useMemo } from 'react';
import { FeedbackItem, ThemeLabel, SentimentLabel, FeedbackSource, THEME_LABELS, SOURCE_LABELS } from '@/lib/types';
import { SentimentBadge } from '@/components/shared/SentimentBadge';
import { ThemeBadge } from '@/components/shared/ThemeBadge';
import { ExternalLink } from 'lucide-react';

interface FeedbackTableProps {
  items: FeedbackItem[];
}

const ITEMS_PER_PAGE = 20;

export function FeedbackTable({ items }: FeedbackTableProps) {
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = items;

    if (sourceFilter !== 'all') {
      result = result.filter((i) => i.source === sourceFilter);
    }
    if (sentimentFilter !== 'all') {
      result = result.filter((i) => i.sentiment === sentimentFilter);
    }
    if (themeFilter !== 'all') {
      result = result.filter((i) => i.themes.includes(themeFilter as ThemeLabel));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((i) => i.text.toLowerCase().includes(q) || i.title?.toLowerCase().includes(q));
    }

    return result;
  }, [items, sourceFilter, sentimentFilter, themeFilter, searchQuery]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search feedback..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 flex-1 min-w-[200px]"
        />
        <select
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Sources</option>
          {Object.entries(SOURCE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={sentimentFilter}
          onChange={(e) => { setSentimentFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Sentiment</option>
          <option value="positive">😊 Positive</option>
          <option value="neutral">😐 Neutral</option>
          <option value="negative">😤 Negative</option>
        </select>
        <select
          value={themeFilter}
          onChange={(e) => { setThemeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Themes</option>
          {Object.entries(THEME_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-4">
        Showing {paginated.length} of {filtered.length} items
        {filtered.length !== items.length && ` (filtered from ${items.length})`}
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Source</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Sentiment</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Themes</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Feedback</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginated.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-xs font-medium text-gray-700">
                    {SOURCE_LABELS[item.source]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <SentimentBadge sentiment={item.sentiment} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {item.themes.map((theme) => (
                      <ThemeBadge key={theme} theme={theme} />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 max-w-md">
                  <p className="text-gray-700 line-clamp-2 text-xs leading-relaxed">
                    {item.title && <strong className="text-gray-900">{item.title}: </strong>}
                    {item.text}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {item.sourceUrl && (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-indigo-600 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-700 disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-700 disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

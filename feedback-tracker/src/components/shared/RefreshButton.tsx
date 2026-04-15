'use client';

import { useState, useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { refreshFeedback } from '@/app/actions';

export function RefreshButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  const handleRefresh = () => {
    setResult(null);
    startTransition(async () => {
      try {
        const data = await refreshFeedback();
        setResult(`Loaded ${data.itemCount} items`);
        // Force a full page refresh to update server components
        window.location.reload();
      } catch (error) {
        setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className="text-sm text-emerald-600 animate-fade-in">{result}</span>
      )}
      <button
        onClick={handleRefresh}
        disabled={isPending}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
        {isPending ? 'Loading...' : 'Refresh Data'}
      </button>
    </div>
  );
}

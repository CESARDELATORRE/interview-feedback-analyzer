import { RefreshCw } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
      <RefreshCw className="w-16 h-16 mb-4 opacity-30" />
      <h2 className="text-xl font-semibold mb-2">No feedback data yet</h2>
      <p className="text-sm max-w-md text-center">
        Click <strong>Refresh Data</strong> to fetch feedback from CSV surveys, Hacker News, GitHub Issues, and Reddit.
      </p>
    </div>
  );
}

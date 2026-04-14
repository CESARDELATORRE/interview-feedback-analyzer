import { getFeedback } from '@/app/actions';
import { FeedbackTable } from '@/components/feedback/FeedbackTable';
import { EmptyState } from '@/components/shared/EmptyState';

export default async function FeedbackExplorerPage() {
  const { items, lastRefreshed } = await getFeedback();

  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Feedback Explorer</h1>
        <p className="text-sm text-gray-500 mt-1">
          Browse, filter, and search {items.length} feedback items
          {lastRefreshed && (
            <> · Last refreshed {new Date(lastRefreshed).toLocaleString()}</>
          )}
        </p>
      </div>

      <FeedbackTable items={items} />
    </div>
  );
}

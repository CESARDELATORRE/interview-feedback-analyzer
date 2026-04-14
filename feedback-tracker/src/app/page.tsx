import { getFeedback } from './actions';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { SentimentChart } from '@/components/dashboard/SentimentChart';
import { TopThemesChart } from '@/components/dashboard/TopThemesChart';
import { SentimentBySource } from '@/components/dashboard/SentimentBySource';
import { SentimentTimeline } from '@/components/dashboard/SentimentTimeline';
import { RatingDistributions } from '@/components/dashboard/RatingDistributions';
import { EmptyState } from '@/components/shared/EmptyState';

export default async function DashboardPage() {
  const { items, lastRefreshed } = await getFeedback();

  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Analyzing {items.length} feedback items
            {lastRefreshed && (
              <> · Last refreshed {new Date(lastRefreshed).toLocaleString()}</>
            )}
          </p>
        </div>
      </div>

      <SummaryCards items={items} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SentimentChart items={items} />
        <TopThemesChart items={items} />
      </div>

      <SentimentBySource items={items} />

      <SentimentTimeline items={items} />

      <RatingDistributions items={items} />
    </div>
  );
}

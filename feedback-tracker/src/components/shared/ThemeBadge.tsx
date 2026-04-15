import { ThemeLabel, THEME_LABELS } from '@/lib/types';

const THEME_COLORS: Record<ThemeLabel, string> = {
  'agent-mode': 'bg-violet-100 text-violet-700',
  'code-completion': 'bg-blue-100 text-blue-700',
  'performance': 'bg-orange-100 text-orange-700',
  'model-quality': 'bg-cyan-100 text-cyan-700',
  'usability': 'bg-pink-100 text-pink-700',
  'feature-request': 'bg-lime-100 text-lime-700',
  'other': 'bg-gray-100 text-gray-700',
};

export function ThemeBadge({ theme }: { theme: ThemeLabel }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${THEME_COLORS[theme]}`}
    >
      {THEME_LABELS[theme]}
    </span>
  );
}

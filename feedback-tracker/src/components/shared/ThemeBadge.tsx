import { ThemeLabel, THEME_LABELS } from '@/lib/types';

const THEME_COLORS: Record<ThemeLabel, string> = {
  'agent-mode': 'bg-violet-500/20 text-violet-300',
  'code-completion': 'bg-blue-500/20 text-blue-300',
  'performance': 'bg-orange-500/20 text-orange-300',
  'model-quality': 'bg-cyan-500/20 text-cyan-300',
  'usability': 'bg-pink-500/20 text-pink-300',
  'feature-request': 'bg-lime-500/20 text-lime-300',
  'other': 'bg-gray-500/20 text-gray-300',
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

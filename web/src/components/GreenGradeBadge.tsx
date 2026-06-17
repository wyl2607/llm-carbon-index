import type { GreenGrade } from '../lib/rankings';

// Grade → color. A (greenest) = accent/green, E (worst) = warning. Display only.
const GRADE_CLASS: Record<GreenGrade, string> = {
  A: 'bg-[var(--accent-bg)] text-[var(--accent)] border-[var(--accent-border)]',
  B: 'bg-[var(--accent-bg)] text-[var(--accent)] border-[var(--accent-border)] opacity-80',
  C: 'bg-[var(--bg-elev)] text-[var(--text-secondary)] border-[var(--border)]',
  D: 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning-border)] opacity-80',
  E: 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning-border)]',
};

export function GreenGradeBadge({ grade }: { grade: GreenGrade }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-md border text-xs font-black ${GRADE_CLASS[grade]}`}
      title={`Green grade ${grade}`}
    >
      {grade}
    </span>
  );
}

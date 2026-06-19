import { NavLink } from 'react-router-dom';
import { useI18n, type Lang } from '../lib/i18n';

interface Props {
  lang: Lang;
}

/**
 * Primary site navigation. Lives in the sticky header between the brand and the
 * global controls. Uses react-router NavLink so the active route is highlighted
 * automatically; wraps to a second row on narrow viewports.
 */
export function Nav({ lang }: Props) {
  const tt = useI18n(lang);
  const items: { to: string; label: string; end?: boolean }[] = [
    { to: '/', label: tt.navOverview, end: true },
    { to: '/rankings', label: tt.navRankings },
    { to: '/regions', label: tt.navRegions },
    { to: '/frontier', label: tt.navFrontier },
    { to: '/recommendations', label: tt.navRecommendations },
    { to: '/methodology', label: tt.navMethodology },
  ];
  return (
    <nav className="flex flex-wrap items-center gap-1 order-last w-full sm:order-none sm:w-auto">
      {items.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isActive
                ? 'bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent-border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-elev)] border border-transparent'
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

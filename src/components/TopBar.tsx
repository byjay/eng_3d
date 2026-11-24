import type { ActiveTab } from '../core/types';

interface TopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  dueSrsCount: number;
  onOpenSettings: () => void;
}

export function TopBar({
  activeTab,
  onSelectTab,
  dueSrsCount,
  onOpenSettings,
}: TopBarProps) {
  const navItems: Array<{ id: ActiveTab; label: string; shortLabel: string }> = [
    { id: 'tutor', label: '3D Tutor', shortLabel: 'Tutor' },
    { id: 'guide', label: '300·500 Guide', shortLabel: 'Guide' },
    { id: 'shadowing', label: 'Shadowing', shortLabel: 'Clips' },
    {
      id: 'srs',
      label: dueSrsCount > 0 ? `SRS Review (${dueSrsCount})` : 'SRS Review',
      shortLabel: dueSrsCount > 0 ? `SRS (${dueSrsCount})` : 'SRS',
    },
    { id: 'progress', label: 'Progress', shortLabel: 'Stats' },
  ];

  return (
    <header className="w-full bg-slate-950/95 border-b border-slate-800/90 px-3 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-8 z-30 shrink-0">
      {/* Zone 1: Single-element Brand Wordmark */}
      <button
        type="button"
        onClick={() => onSelectTab('tutor')}
        className="font-display text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-sky-300 transition-colors cursor-pointer"
      >
        FluentStage
      </button>

      {/* Zone 2: Clean single-line navigation links */}
      <nav aria-label="Primary navigation" className="flex items-center gap-3 sm:gap-6 min-w-0">
        {navItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`relative py-1 text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                active
                  ? 'text-white border-b-2 border-sky-400'
                  : 'text-slate-400 hover:text-slate-100 border-b-2 border-transparent'
              }`}
            >
              <span className="sm:hidden">{item.shortLabel}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Single Primary Action */}
      <div className="shrink-0">
        <button
          type="button"
          onClick={onOpenSettings}
          className="px-2.5 sm:px-4 py-1.5 text-xs font-medium text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span className="sm:hidden">Privacy</span>
          <span className="hidden sm:inline">Account &amp; Privacy</span>
        </button>
      </div>
    </header>
  );
}

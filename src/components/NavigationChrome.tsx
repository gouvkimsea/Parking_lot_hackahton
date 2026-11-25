import React from 'react';
import { Home, Map, Settings } from 'lucide-react';
import type { ActiveTab } from '../types/parking';

interface DesktopTopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  activeBookingCount: number;
  onQuickBook: () => void;
}

export const DesktopTopBar: React.FC<DesktopTopBarProps> = ({
  activeTab,
  onSelectTab,
  activeBookingCount,
  onQuickBook,
}) => {
  return (
    <header className="hidden md:block sticky top-0 z-40 bg-[#F6F8F3]/90 backdrop-blur-md border-b border-black/[0.05]">
      <div className="max-w-[1120px] mx-auto px-5 lg:px-8 h-[60px] flex items-center justify-between gap-6 lg:gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className="text-[20px] font-extrabold tracking-[-0.03em] text-[#141517] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517] rounded-lg px-1"
        >
          PrestigePark
        </button>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav aria-label="Primary navigation" className="flex items-center gap-8">
          {(
            [
              { id: 'home', label: 'Home' },
              { id: 'map', label: 'Map' },
              {
                id: 'settings',
                label:
                  activeBookingCount > 0
                    ? `Bookings & Settings (${activeBookingCount})`
                    : 'Settings',
              },
            ] as const
          ).map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-2 text-[14px] whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517] rounded ${
                  isActive
                    ? 'font-bold text-[#141517]'
                    : 'font-medium text-[#6B7280] hover:text-[#141517]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute left-0 right-0 -bottom-[1px] h-[3px] rounded-full bg-[#C5EC45]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onQuickBook}
            className="px-5 h-10 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[13.5px] font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517]"
          >
            Book Selected Space
          </button>
        </div>
      </div>
    </header>
  );
};

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  activeBookingCount: number;
}

/**
 * Exact recreation of the Screen 1 floating pill bottom navigation bar:
 * Home (lime active pill) | Map (soft grey pill) | Setting (soft grey pill)
 */
export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  activeBookingCount,
}) => {
  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'map', label: 'Map', icon: Map },
    { id: 'settings', label: 'Setting', icon: Settings },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-black/[0.05] px-4 py-3 shadow-[0_-8px_24px_rgba(20,21,23,0.05)]"
    >
      <div className="max-w-[440px] mx-auto grid grid-cols-3 gap-2.5">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`h-11 rounded-full px-3 flex items-center justify-center gap-2 text-[13.5px] transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517] ${
                isActive
                  ? 'bg-[#C5EC45] text-[#141517] font-bold shadow-[0_4px_12px_rgba(197,236,69,0.35)]'
                  : 'bg-[#F4F5F6] text-[#767B84] hover:text-[#141517] font-medium'
              }`}
            >
              <Icon className="w-[17px] h-[17px] shrink-0" aria-hidden="true" />
              <span>{label}</span>
              {id === 'settings' && activeBookingCount > 0 && (
                <span className="text-[11px] font-bold tabular-nums opacity-80">
                  ({activeBookingCount})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

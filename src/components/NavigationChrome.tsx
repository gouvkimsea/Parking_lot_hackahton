import React, { useEffect, useState } from 'react';
import {
  Bookmark,
  Car,
  Home,
  Map,
  Menu,
  MessageSquarePlus,
  Plus,
  Settings,
  UserCheck,
  X,
} from 'lucide-react';
import type { ActiveTab, CommunityUser } from '../types/parking';

interface DesktopTopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  activeBookingCount: number;
  favoriteCount: number;
  currentUser: CommunityUser | null;
  pendingModerationCount: number;
  onQuickBook: () => void;
  onRequestAddParking: () => void;
  onOpenAuth: () => void;
}

export const DesktopTopBar: React.FC<DesktopTopBarProps> = ({
  activeTab,
  onSelectTab,
  activeBookingCount,
  currentUser,
  pendingModerationCount,
  onQuickBook,
  onRequestAddParking,
  onOpenAuth,
}) => {
  return (
    <header className="hidden md:block sticky top-0 z-40 bg-[#F6F8F3]/95 backdrop-blur-md border-b border-black/[0.05]">
      <div className="max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-4 lg:px-6 xl:px-8 h-16 flex items-center justify-between gap-3 lg:gap-5">
        {/* Zone 1: Brand Wordmark + Phnom Penh Focus Pill */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            className="min-h-[44px] text-[19px] lg:text-[20px] font-extrabold tracking-[-0.03em] text-[#141517] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517] rounded-lg px-1.5 flex items-center"
          >
            ParkEasy
          </button>
          <span className="px-2.5 py-0.5 rounded-full bg-[#E8F8B4] text-[#3F5A05] text-[11px] font-bold whitespace-nowrap">
            Phnom Penh
          </span>
        </div>

        {/* Zone 2: Responsive Single-Line Navigation Links */}
        <nav
          aria-label="Primary navigation"
          className="flex items-center gap-3 md:gap-4 lg:gap-6"
        >
          {(
            [
              { id: 'home', label: 'Home', tabletLabel: 'Home' },
              { id: 'map', label: 'Discover Map', tabletLabel: 'Map' },
              {
                id: 'community',
                label:
                  currentUser?.role === 'admin' && pendingModerationCount > 0
                    ? `Contributions (${pendingModerationCount})`
                    : 'Contributions',
                tabletLabel: 'Contribute',
              },
              {
                id: 'settings',
                label:
                  activeBookingCount > 0
                    ? `Saved (${activeBookingCount})`
                    : 'Saved & Settings',
                tabletLabel:
                  activeBookingCount > 0
                    ? `Saved (${activeBookingCount})`
                    : 'Saved',
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
                className={`relative min-h-[44px] px-1.5 flex items-center text-[13px] lg:text-[14px] whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517] rounded ${
                  isActive
                    ? 'font-bold text-[#141517]'
                    : 'font-medium text-[#6B7280] hover:text-[#141517]'
                }`}
              >
                <span className="lg:hidden">{item.tabletLabel}</span>
                <span className="hidden lg:inline">{item.label}</span>
                {isActive && (
                  <span className="absolute left-0 right-0 bottom-1 h-[3px] rounded-full bg-[#C5EC45]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Community Actions & Quick Book */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onRequestAddParking}
            data-testid="header-add-parking-btn"
            className="px-3.5 min-h-[40px] rounded-full bg-[#141517] hover:bg-[#2A2D32] text-white text-[12.5px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#C5EC45]" />
            <span>Add Parking</span>
          </button>

          {currentUser ? (
            <button
              type="button"
              onClick={() => onSelectTab('community')}
              data-testid="header-user-profile-btn"
              className="px-3 min-h-[40px] rounded-full bg-white hover:bg-[#EEF2E6] border border-black/10 text-[#141517] text-[12.5px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#4D6A0A]" />
              <span className="max-w-[100px] truncate">{currentUser.name.split(' ')[0]}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              data-testid="header-signin-btn"
              className="px-3 min-h-[40px] rounded-full bg-white hover:bg-[#EEF2E6] border border-black/10 text-[#141517] text-[12.5px] font-semibold whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
          )}

          <button
            type="button"
            onClick={onQuickBook}
            className="hidden xl:inline-flex items-center px-4 min-h-[40px] rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] active:scale-[0.98] text-[#141517] text-[13px] font-semibold transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517]"
          >
            Book Bay
          </button>
        </div>
      </div>
    </header>
  );
};

interface MobileTopHeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  activeBookingCount: number;
  favoriteCount: number;
  totalLocationCount: number;
  selectedLotName: string;
  currentUser: CommunityUser | null;
  onQuickBook: () => void;
  onOpenBayDemo: () => void;
  onRequestAddParking: () => void;
  onOpenAuth: () => void;
}

export const MobileTopHeader: React.FC<MobileTopHeaderProps> = ({
  activeTab,
  onSelectTab,
  activeBookingCount,
  favoriteCount,
  totalLocationCount,
  selectedLotName,
  currentUser,
  onQuickBook,
  onOpenBayDemo,
  onRequestAddParking,
  onOpenAuth,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [drawerOpen]);

  const navigate = (tab: ActiveTab) => {
    onSelectTab(tab);
    setDrawerOpen(false);
  };

  return (
    <>
      <header className="md:hidden sticky top-0 z-40 bg-[#F6F8F3]/95 backdrop-blur-md border-b border-black/[0.05]">
        <div className="px-3 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => navigate('home')}
              className="min-h-[44px] px-1 flex items-center text-[18px] font-extrabold tracking-[-0.03em] text-[#141517] whitespace-nowrap shrink-0"
            >
              ParkEasy
            </button>
            <span className="hidden min-[380px]:inline-flex px-2 py-0.5 rounded-full bg-[#E8F8B4] text-[#3F5A05] text-[10.5px] font-bold whitespace-nowrap shrink-0">
              Phnom Penh
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => navigate(activeTab === 'map' ? 'home' : 'map')}
              className="min-h-[44px] px-3 rounded-full bg-white border border-black/[0.06] text-[12px] font-semibold text-[#141517] inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
            >
              {activeTab === 'map' ? (
                <>
                  <Home className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Directory</span>
                </>
              ) : (
                <>
                  <Map className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    Map
                    <span className="hidden min-[360px]:inline"> ({totalLocationCount})</span>
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              aria-controls="mobile-nav-drawer"
              className="w-11 h-11 rounded-full bg-white border border-black/[0.06] text-[#141517] flex items-center justify-center shadow-2xs shrink-0"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Secondary Hamburger Drawer for Mobile */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-[1000] bg-[#141517]/45 backdrop-blur-[2px] flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile menu"
          id="mobile-nav-drawer"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="w-[min(320px,88vw)] h-full bg-white shadow-[-12px_0_36px_rgba(20,21,23,0.18)] flex flex-col overflow-y-auto clean-scroll"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3.5 border-b border-[#F0F1F3] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[18px] font-extrabold tracking-[-0.03em] text-[#141517]">
                  ParkEasy
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#E8F8B4] text-[#3F5A05] text-[10.5px] font-bold">
                  {totalLocationCount} lots
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="w-11 h-11 rounded-full bg-[#F4F5F6] text-[#141517] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 flex-1">
              <div className="bg-[#F6F8F3] rounded-2xl p-3.5 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#525760]">
                  Selected Location
                </p>
                <p className="text-[14px] font-bold text-[#141517] truncate">
                  {selectedLotName}
                </p>
                <p className="text-[12px] text-[#767B84] tabular-nums">
                  {activeBookingCount} active booking{activeBookingCount === 1 ? '' : 's'} ·{' '}
                  {favoriteCount} saved
                </p>
              </div>

              <nav aria-label="Drawer navigation" className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => navigate('home')}
                  className={`w-full min-h-[46px] px-3.5 rounded-2xl flex items-center gap-3 text-[14px] font-semibold transition-colors ${
                    activeTab === 'home'
                      ? 'bg-[#C5EC45] text-[#141517]'
                      : 'bg-[#F6F7F8] text-[#141517]'
                  }`}
                >
                  <Home className="w-4 h-4 shrink-0" />
                  <span>Home Directory & Rates</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('map')}
                  className={`w-full min-h-[46px] px-3.5 rounded-2xl flex items-center gap-3 text-[14px] font-semibold transition-colors ${
                    activeTab === 'map'
                      ? 'bg-[#C5EC45] text-[#141517]'
                      : 'bg-[#F6F7F8] text-[#141517]'
                  }`}
                >
                  <Map className="w-4 h-4 shrink-0" />
                  <span>Phnom Penh Interactive Map</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('community')}
                  className={`w-full min-h-[46px] px-3.5 rounded-2xl flex items-center gap-3 text-[14px] font-semibold transition-colors ${
                    activeTab === 'community'
                      ? 'bg-[#C5EC45] text-[#141517]'
                      : 'bg-[#F6F7F8] text-[#141517]'
                  }`}
                >
                  <MessageSquarePlus className="w-4 h-4 shrink-0" />
                  <span>Community & Reviews</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    onRequestAddParking();
                  }}
                  className="w-full min-h-[46px] px-3.5 rounded-2xl flex items-center gap-3 text-[14px] font-semibold bg-[#F3FCE0] text-[#3F5A05]"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Add Missing Parking</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    if (currentUser) {
                      navigate('community');
                    } else {
                      onOpenAuth();
                    }
                  }}
                  className="w-full min-h-[46px] px-3.5 rounded-2xl flex items-center gap-3 text-[14px] font-semibold bg-[#F6F7F8] text-[#141517]"
                >
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span>{currentUser ? `${currentUser.name} Profile` : 'Sign In / Register'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    onOpenBayDemo();
                  }}
                  className="w-full min-h-[46px] px-3.5 rounded-2xl flex items-center gap-3 text-[14px] font-semibold bg-[#F6F7F8] text-[#141517]"
                >
                  <Car className="w-4 h-4 shrink-0" />
                  <span>Select Parking Bay</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('settings')}
                  className={`w-full min-h-[46px] px-3.5 rounded-2xl flex items-center justify-between gap-3 text-[14px] font-semibold transition-colors ${
                    activeTab === 'settings'
                      ? 'bg-[#C5EC45] text-[#141517]'
                      : 'bg-[#F6F7F8] text-[#141517]'
                  }`}
                >
                  <span className="inline-flex items-center gap-3">
                    <Bookmark className="w-4 h-4 shrink-0" />
                    <span>Saved, Vehicles & Settings</span>
                  </span>
                  {activeBookingCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-white text-[11px] font-bold tabular-nums">
                      {activeBookingCount}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            <div className="p-4 border-t border-[#F0F1F3]">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  onQuickBook();
                }}
                className="w-full min-h-[48px] rounded-full bg-[#141517] text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2"
              >
                <Car className="w-4 h-4 text-[#C5EC45]" />
                <span>Book Selected Bay</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  activeBookingCount: number;
}

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
    { id: 'community', label: 'Contribute', icon: MessageSquarePlus },
    { id: 'settings', label: 'Saved', icon: Settings },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-black/[0.06] px-2.5 sm:px-4 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(20,21,23,0.06)]"
    >
      <div className="max-w-[480px] mx-auto grid grid-cols-4 gap-1.5">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`min-h-[44px] rounded-full px-2 sm:px-3 flex items-center justify-center gap-1.5 text-[12.5px] sm:text-[13.5px] transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517] ${
                isActive
                  ? 'bg-[#C5EC45] text-[#141517] font-bold shadow-[0_4px_12px_rgba(197,236,69,0.35)]'
                  : 'bg-[#F4F5F6] text-[#767B84] hover:text-[#141517] font-medium'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{label}</span>
              {id === 'settings' && activeBookingCount > 0 && (
                <span className="text-[11px] font-bold tabular-nums opacity-85">
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

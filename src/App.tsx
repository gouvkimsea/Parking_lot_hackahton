import { useEffect, useMemo, useRef, useState } from 'react';
import { BookingModal } from './components/BookingModal';
import { DetailsPanel } from './components/DetailsPanel';
import { DiscoverPanel } from './components/DiscoverPanel';
import { MapExplorerView } from './components/MapExplorerView';
import { DesktopTopBar, MobileBottomNav } from './components/NavigationChrome';
import { SettingsBookingsView } from './components/SettingsBookingsView';
import { SpaceSelectorPanel } from './components/SpaceSelectorPanel';
import { INITIAL_VEHICLES, PARKING_LOTS } from './data/parkingLots';
import type {
  ActiveTab,
  BookingRecord,
  FloorId,
  MobileScreen,
  ParkingBay,
  SavedVehicle,
  UserPreferences,
  VehicleCategory,
} from './types/parking';
import {
  filterParkingLots,
  findFirstAvailableBay,
  getActiveBookedBayKeys,
} from './utils/parkingLogic';

const STORAGE_KEYS = {
  bookings: 'prestigepark_bookings_v1',
  favorites: 'prestigepark_favorites_v1',
  vehicles: 'prestigepark_vehicles_v1',
  preferences: 'prestigepark_preferences_v1',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handleChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  return isDesktop;
}

export default function App() {
  const isDesktop = useIsDesktop();
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [mobileScreen, setMobileScreen] = useState<MobileScreen>('home');

  // Discovery filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<VehicleCategory | 'all'>('car');
  const [showAllLots, setShowAllLots] = useState(false);

  // Selected parking lot, floor & space
  const [selectedLotId, setSelectedLotId] = useState<string>('prestige-parking');
  const [activeFloor, setActiveFloor] = useState<FloorId>('ground');
  const [selectedBayId, setSelectedBayId] = useState<string | null>('ground-G-03');
  const [highlightSpacePanel, setHighlightSpacePanel] = useState(false);

  // Persisted user data
  const [bookings, setBookings] = useState<BookingRecord[]>(() =>
    loadFromStorage<BookingRecord[]>(STORAGE_KEYS.bookings, [])
  );
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() =>
    loadFromStorage<string[]>(STORAGE_KEYS.favorites, ['prestige-parking'])
  );
  const [vehicles, setVehicles] = useState<SavedVehicle[]>(() =>
    loadFromStorage<SavedVehicle[]>(STORAGE_KEYS.vehicles, INITIAL_VEHICLES)
  );
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    loadFromStorage<UserPreferences>(STORAGE_KEYS.preferences, {
      autoGateEntry: true,
      pushReminders: true,
      evPriority: false,
    })
  );

  // Modal state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingModalMode, setBookingModalMode] = useState<'create' | 'view-pass'>('create');
  const [viewedPass, setViewedPass] = useState<BookingRecord | null>(null);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  const spaceColumnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.bookings, JSON.stringify(bookings));
    } catch {
      // ignore quota errors
    }
  }, [bookings]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favoriteIds));
    } catch {
      // ignore quota errors
    }
  }, [favoriteIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.vehicles, JSON.stringify(vehicles));
    } catch {
      // ignore quota errors
    }
  }, [vehicles]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(preferences));
    } catch {
      // ignore quota errors
    }
  }, [preferences]);

  const activeBookedBayKeys = useMemo(
    () => getActiveBookedBayKeys(bookings),
    [bookings]
  );

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const filteredLots = useMemo(() => {
    const base = filterParkingLots(PARKING_LOTS, {
      query: searchQuery,
      category: activeCategory,
    });
    if (!preferences.evPriority) return base;
    return [...base].sort((a, b) => {
      const aEv = a.categories.includes('ev') ? 1 : 0;
      const bEv = b.categories.includes('ev') ? 1 : 0;
      return bEv - aEv;
    });
  }, [searchQuery, activeCategory, preferences.evPriority]);

  const selectedLot = useMemo(
    () => PARKING_LOTS.find((l) => l.id === selectedLotId) ?? PARKING_LOTS[0],
    [selectedLotId]
  );

  // Ensure a valid available bay is selected whenever lot, floor, or bookings change
  useEffect(() => {
    const floorBays = selectedLot.floors[activeFloor];
    const currentStillValid = floorBays.some(
      (b) =>
        b.id === selectedBayId &&
        !b.baseOccupied &&
        !activeBookedBayKeys.has(`${selectedLot.id}::${b.id}`)
    );

    if (!currentStillValid) {
      const preferred =
        selectedLot.id === 'prestige-parking' && activeFloor === 'ground'
          ? 'G-03'
          : undefined;
      const nextOpen = findFirstAvailableBay(
        selectedLot,
        activeFloor,
        activeBookedBayKeys,
        preferred
      );
      setSelectedBayId(nextOpen?.id ?? null);
    }
  }, [selectedLot, activeFloor, selectedBayId, activeBookedBayKeys]);

  const selectedBay: ParkingBay | null = useMemo(() => {
    return (
      selectedLot.floors[activeFloor].find((b) => b.id === selectedBayId) ?? null
    );
  }, [selectedLot, activeFloor, selectedBayId]);

  const activeBookingCount = useMemo(
    () => bookings.filter((b) => b.status === 'active').length,
    [bookings]
  );

  const handleSelectLot = (lotId: string, openDetailsOnMobile = false) => {
    setSelectedLotId(lotId);
    setActiveFloor('ground');
    const targetLot = PARKING_LOTS.find((l) => l.id === lotId) ?? PARKING_LOTS[0];
    const preferred = lotId === 'prestige-parking' ? 'G-03' : undefined;
    const openBay = findFirstAvailableBay(
      targetLot,
      'ground',
      activeBookedBayKeys,
      preferred
    );
    setSelectedBayId(openBay?.id ?? null);
    if (openDetailsOnMobile) {
      setMobileScreen('details');
    }
  };

  const handleCyclePreviousLot = () => {
    const idx = PARKING_LOTS.findIndex((l) => l.id === selectedLot.id);
    const prevIdx = (idx - 1 + PARKING_LOTS.length) % PARKING_LOTS.length;
    handleSelectLot(PARKING_LOTS[prevIdx].id, false);
  };

  const handleToggleFavorite = (lotId: string) => {
    setFavoriteIds((prev) =>
      prev.includes(lotId) ? prev.filter((id) => id !== lotId) : [...prev, lotId]
    );
  };

  const handleSelectSpaceAction = () => {
    setMobileScreen('select-space');
    setHighlightSpacePanel(true);
    spaceColumnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    window.setTimeout(() => setHighlightSpacePanel(false), 1200);
  };

  const handleOpenBookingModal = () => {
    if (!selectedBay) return;
    setBookingModalMode('create');
    setViewedPass(null);
    setBookingModalOpen(true);
  };

  const handleConfirmBooking = (record: BookingRecord) => {
    setBookings((prev) => [record, ...prev]);
  };

  const handleCancelBooking = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
    );
  };

  const handleShowPass = (booking: BookingRecord) => {
    setViewedPass(booking);
    setBookingModalMode('view-pass');
    setBookingModalOpen(true);
  };

  const handleAddVehicle = (vehicle: SavedVehicle) => {
    setVehicles((prev) => [vehicle, ...prev]);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
  };

  const handleTogglePreference = (key: keyof UserPreferences) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'home') {
      setMobileScreen('home');
    }
  };

  const showMobileBottomBar =
    activeTab !== 'home' || mobileScreen === 'home';

  return (
    <div className="min-h-screen flex flex-col bg-white lg:bg-[#F6F8F3] text-[#141517]">
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Desktop Top Bar */}
      <DesktopTopBar
        activeTab={activeTab}
        onSelectTab={handleTabChange}
        activeBookingCount={activeBookingCount}
        onQuickBook={() => {
          setActiveTab('home');
          handleOpenBookingModal();
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full lg:py-6">
        {activeTab === 'home' && isDesktop && (
          /* DESKTOP 3-COLUMN SYNCHRONIZED WORKBENCH (Direct visual match to 3-panel reference) */
          <div className="grid grid-cols-12 gap-6 max-w-[1380px] mx-auto px-8 items-stretch h-[calc(100vh-116px)] min-h-[690px] max-h-[820px]">
            <div className="col-span-4 min-h-0 flex flex-col">
              <DiscoverPanel
                lots={filteredLots}
                selectedLotId={selectedLot.id}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
                showAll={showAllLots}
                onToggleShowAll={() => setShowAllLots((prev) => !prev)}
                activeBookedBayKeys={activeBookedBayKeys}
                onSelectLot={(id) => handleSelectLot(id, false)}
                onOpenProfile={() => setActiveTab('settings')}
              />
            </div>

            <div className="col-span-4 min-h-0 flex flex-col">
              <DetailsPanel
                lot={selectedLot}
                isFavorite={favoriteSet.has(selectedLot.id)}
                onToggleFavorite={handleToggleFavorite}
                activeBookedBayKeys={activeBookedBayKeys}
                onBack={handleCyclePreviousLot}
                onSelectSpace={handleSelectSpaceAction}
                onOpenOnMap={(id) => {
                  handleSelectLot(id, false);
                  setActiveTab('map');
                }}
                isDesktop
              />
            </div>

            <div ref={spaceColumnRef} className="col-span-4 min-h-0 flex flex-col">
              <SpaceSelectorPanel
                lot={selectedLot}
                activeFloor={activeFloor}
                onFloorChange={setActiveFloor}
                selectedBayId={selectedBayId}
                onSelectBay={(bay) => setSelectedBayId(bay.id)}
                activeBookedBayKeys={activeBookedBayKeys}
                onBack={handleCyclePreviousLot}
                onBookNow={handleOpenBookingModal}
                highlighted={highlightSpacePanel}
                isDesktop
              />
            </div>
          </div>
        )}

        {activeTab === 'home' && !isDesktop && (
          /* MOBILE / TABLET SINGLE-SCREEN FLOW (Exact Screen 1 -> Screen 2 -> Screen 3) */
          <div className="max-w-[520px] mx-auto min-h-screen bg-white">
            {mobileScreen === 'home' && (
              <div key="mobile-home" className="min-h-screen screen-enter">
                <DiscoverPanel
                  lots={filteredLots}
                  selectedLotId={selectedLot.id}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  activeCategory={activeCategory}
                  onCategoryChange={setActiveCategory}
                  showAll={showAllLots}
                  onToggleShowAll={() => setShowAllLots((prev) => !prev)}
                  activeBookedBayKeys={activeBookedBayKeys}
                  onSelectLot={(id) => handleSelectLot(id, true)}
                  onOpenProfile={() => setActiveTab('settings')}
                />
              </div>
            )}

            {mobileScreen === 'details' && (
              <div key="mobile-details" className="min-h-screen screen-enter">
                <DetailsPanel
                  lot={selectedLot}
                  isFavorite={favoriteSet.has(selectedLot.id)}
                  onToggleFavorite={handleToggleFavorite}
                  activeBookedBayKeys={activeBookedBayKeys}
                  onBack={() => setMobileScreen('home')}
                  onSelectSpace={() => setMobileScreen('select-space')}
                  onOpenOnMap={(id) => {
                    handleSelectLot(id, false);
                    setActiveTab('map');
                  }}
                />
              </div>
            )}

            {mobileScreen === 'select-space' && (
              <div key="mobile-select-space" className="min-h-screen screen-enter">
                <SpaceSelectorPanel
                  lot={selectedLot}
                  activeFloor={activeFloor}
                  onFloorChange={setActiveFloor}
                  selectedBayId={selectedBayId}
                  onSelectBay={(bay) => setSelectedBayId(bay.id)}
                  activeBookedBayKeys={activeBookedBayKeys}
                  onBack={() => setMobileScreen('details')}
                  onBookNow={handleOpenBookingModal}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'map' && (
          <MapExplorerView
            lots={filteredLots}
            allLots={PARKING_LOTS}
            selectedLotId={selectedLot.id}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            favoriteIds={favoriteSet}
            onToggleFavorite={handleToggleFavorite}
            activeBookedBayKeys={activeBookedBayKeys}
            onSelectLot={(id) => handleSelectLot(id, false)}
            onOpenDetails={(id) => {
              handleSelectLot(id, true);
              setActiveTab('home');
            }}
            onOpenSelectSpace={(id) => {
              handleSelectLot(id, false);
              setActiveTab('home');
              setMobileScreen('select-space');
              setHighlightSpacePanel(true);
              window.setTimeout(() => setHighlightSpacePanel(false), 1200);
            }}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsBookingsView
            bookings={bookings}
            lots={PARKING_LOTS}
            favoriteIds={favoriteSet}
            vehicles={vehicles}
            preferences={preferences}
            activeBookedBayKeys={activeBookedBayKeys}
            onCancelBooking={handleCancelBooking}
            onShowPass={handleShowPass}
            onOpenLot={(id) => {
              handleSelectLot(id, true);
              setActiveTab('home');
            }}
            onAddVehicle={handleAddVehicle}
            onDeleteVehicle={handleDeleteVehicle}
            onTogglePreference={handleTogglePreference}
          />
        )}
      </main>

      {/* Mobile Bottom Pill Navigation (Home | Map | Setting) */}
      {showMobileBottomBar && (
        <MobileBottomNav
          activeTab={activeTab}
          onSelectTab={handleTabChange}
          activeBookingCount={activeBookingCount}
        />
      )}

      {/* Booking Checkout & Digital Pass Modal */}
      <BookingModal
        isOpen={bookingModalOpen}
        mode={bookingModalMode}
        lot={selectedLot}
        floor={activeFloor}
        bay={selectedBay}
        vehicles={vehicles}
        existingPass={viewedPass}
        onClose={() => setBookingModalOpen(false)}
        onConfirmBooking={handleConfirmBooking}
        onViewBookings={() => setActiveTab('settings')}
      />
    </div>
  );
}

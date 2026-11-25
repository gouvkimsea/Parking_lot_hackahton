import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookingModal } from './components/BookingModal';
import { DailyRatesChart } from './components/DailyRatesChart';
import { DetailsPanel } from './components/DetailsPanel';
import { DiscoverPanel } from './components/DiscoverPanel';
import { FacilityDetailDrawer } from './components/FacilityDetailDrawer';
import { MapExplorerView } from './components/MapExplorerView';
import { DesktopTopBar, MobileBottomNav } from './components/NavigationChrome';
import { SettingsBookingsView } from './components/SettingsBookingsView';
import { SpaceSelectorPanel } from './components/SpaceSelectorPanel';
import { INITIAL_VEHICLES, PARKING_LOTS } from './data/parkingLots';
import type {
  ActiveTab,
  AvailabilityStatus,
  BookingRecord,
  EvFilterMode,
  FacilityType,
  FloorId,
  MobileScreen,
  ParkingBay,
  ParkingLot,
  PriceBracketFilter,
  PriceReport,
  SavedVehicle,
  UserPreferences,
  VehicleCategory,
} from './types/parking';
import {
  calculateDistanceKm,
  filterParkingLots,
  filterPhnomPenhLots,
  findFirstAvailableBay,
  getActiveBookedBayKeys,
} from './utils/parkingLogic';

const STORAGE_KEYS = {
  bookings: 'parkeasy_pp_bookings_v1',
  favorites: 'parkeasy_pp_favorites_v1',
  vehicles: 'parkeasy_pp_vehicles_v1',
  preferences: 'parkeasy_pp_preferences_v1',
  priceReports: 'parkeasy_pp_price_reports_v1',
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
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [mobileScreen, setMobileScreen] = useState<MobileScreen>('home');

  // Dynamic lot list (base verified Phnom Penh dataset + optional Google Places live discoveries)
  const [googleDiscoveredLots, setGoogleDiscoveredLots] = useState<ParkingLot[]>([]);
  const allLots = useMemo(
    () => [...PARKING_LOTS, ...googleDiscoveredLots],
    [googleDiscoveredLots]
  );

  // Phnom Penh discovery filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All Phnom Penh');
  const [activeCategory, setActiveCategory] = useState<VehicleCategory | 'all'>('all');
  const [priceBracket, setPriceBracket] = useState<PriceBracketFilter>('all');
  const [facilityType, setFacilityType] = useState<FacilityType | 'all'>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<
    AvailabilityStatus | 'all'
  >('all');
  const [evFilter, setEvFilter] = useState<EvFilterMode>('all');
  const [nearUserOnly, setNearUserOnly] = useState(false);
  const [userPosition, setUserPosition] = useState<google.maps.LatLngLiteral | null>(
    null
  );
  const [showAllLots, setShowAllLots] = useState(false);

  // Selected parking lot, detail drawer & bay selector state
  const [selectedLotId, setSelectedLotId] = useState<string>('aeon-mall-1');
  const [drawerLotId, setDrawerLotId] = useState<string | null>(null);
  const [activeFloor, setActiveFloor] = useState<FloorId>('ground');
  const [selectedBayId, setSelectedBayId] = useState<string | null>('ground-G-03');
  const [highlightSpacePanel, setHighlightSpacePanel] = useState(false);
  const [externalRouteRequest, setExternalRouteRequest] = useState<{
    lot: ParkingLot;
    seq: number;
  } | null>(null);

  // Persisted user data
  const [bookings, setBookings] = useState<BookingRecord[]>(() =>
    loadFromStorage<BookingRecord[]>(STORAGE_KEYS.bookings, [])
  );
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() =>
    loadFromStorage<string[]>(STORAGE_KEYS.favorites, ['aeon-mall-1'])
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
  const [priceReports, setPriceReports] = useState<PriceReport[]>(() =>
    loadFromStorage<PriceReport[]>(STORAGE_KEYS.priceReports, [])
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

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.priceReports,
        JSON.stringify(priceReports)
      );
    } catch {
      // ignore quota errors
    }
  }, [priceReports]);

  const activeBookedBayKeys = useMemo(
    () => getActiveBookedBayKeys(bookings),
    [bookings]
  );

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const filteredMapLots = useMemo(() => {
    const base = filterPhnomPenhLots(allLots, {
      query: searchQuery,
      district: selectedDistrict,
      vehicleType: activeCategory,
      priceBracket,
      facilityType,
      availability: availabilityFilter,
      evFilter,
      nearUserOnly,
      userPosition,
    });
    if (!preferences.evPriority) return base;
    return [...base].sort((a, b) => {
      const aEv = a.categories.includes('ev') ? 1 : 0;
      const bEv = b.categories.includes('ev') ? 1 : 0;
      return bEv - aEv;
    });
  }, [
    allLots,
    searchQuery,
    selectedDistrict,
    activeCategory,
    priceBracket,
    facilityType,
    availabilityFilter,
    evFilter,
    nearUserOnly,
    userPosition,
    preferences.evPriority,
  ]);

  const filteredDemoLots = useMemo(() => {
    return filterParkingLots(allLots, {
      query: searchQuery,
      category: activeCategory,
    });
  }, [allLots, searchQuery, activeCategory]);

  const selectedLot = useMemo(
    () => allLots.find((l) => l.id === selectedLotId) ?? allLots[0],
    [allLots, selectedLotId]
  );

  const drawerLot = useMemo(
    () => (drawerLotId ? allLots.find((l) => l.id === drawerLotId) ?? null : null),
    [allLots, drawerLotId]
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
        activeFloor === 'ground' ? 'G-03' : undefined;
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

  const handleSelectLot = useCallback(
    (lotId: string, openDetailsOnMobile = false) => {
      setSelectedLotId(lotId);
      setActiveFloor('ground');
      const targetLot = allLots.find((l) => l.id === lotId) ?? allLots[0];
      const openBay = findFirstAvailableBay(
        targetLot,
        'ground',
        activeBookedBayKeys,
        'G-03'
      );
      setSelectedBayId(openBay?.id ?? null);
      if (openDetailsOnMobile) {
        setMobileScreen('details');
      }
    },
    [allLots, activeBookedBayKeys]
  );

  const handleMergeGooglePlacesLots = useCallback((discovered: ParkingLot[]) => {
    setGoogleDiscoveredLots((prev) => {
      const existing = [...PARKING_LOTS, ...prev];
      const additions: ParkingLot[] = [];
      for (const candidate of discovered) {
        const isDuplicate = existing.some(
          (item) =>
            item.id === candidate.id ||
            (calculateDistanceKm(item.position, candidate.position) < 0.08 &&
              item.name.toLowerCase().slice(0, 12) ===
                candidate.name.toLowerCase().slice(0, 12))
        );
        if (!isDuplicate) {
          additions.push(candidate);
          existing.push(candidate);
        }
      }
      return additions.length > 0 ? [...prev, ...additions] : prev;
    });
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedDistrict('All Phnom Penh');
    setActiveCategory('all');
    setPriceBracket('all');
    setFacilityType('all');
    setAvailabilityFilter('all');
    setEvFilter('all');
    setNearUserOnly(false);
  }, []);

  const handleCyclePreviousLot = () => {
    const idx = allLots.findIndex((l) => l.id === selectedLot.id);
    const prevIdx = (idx - 1 + allLots.length) % allLots.length;
    handleSelectLot(allLots[prevIdx].id, false);
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

  const handleSubmitPriceReport = (report: PriceReport) => {
    setPriceReports((prev) => [report, ...prev]);
  };

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'home') {
      setMobileScreen('home');
    }
  };

  const showMobileBottomBar = activeTab !== 'home' || mobileScreen === 'home';

  return (
    <div className="min-h-screen flex flex-col bg-white lg:bg-[#F6F8F3] text-[#141517]">
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota or API restriction reached. You can still explore all Phnom Penh parking rates and EV stations in the directory panel.
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
      <main className="flex-1 w-full lg:py-4">
        {activeTab === 'map' && (
          <MapExplorerView
            allLots={allLots}
            filteredLots={filteredMapLots}
            selectedLotId={selectedLotId}
            searchQuery={searchQuery}
            selectedDistrict={selectedDistrict}
            vehicleType={activeCategory}
            priceBracket={priceBracket}
            facilityType={facilityType}
            availabilityFilter={availabilityFilter}
            evFilter={evFilter}
            nearUserOnly={nearUserOnly}
            userPosition={userPosition}
            onSearchChange={setSearchQuery}
            onDistrictChange={setSelectedDistrict}
            onVehicleTypeChange={setActiveCategory}
            onPriceBracketChange={setPriceBracket}
            onFacilityTypeChange={setFacilityType}
            onAvailabilityFilterChange={setAvailabilityFilter}
            onEvFilterChange={setEvFilter}
            onNearUserOnlyChange={setNearUserOnly}
            onResetFilters={handleResetFilters}
            onUserPositionChange={setUserPosition}
            onSelectLot={(id) => handleSelectLot(id, false)}
            onOpenDetails={(id) => setDrawerLotId(id)}
            onMergeGooglePlacesLots={handleMergeGooglePlacesLots}
            externalRouteRequest={externalRouteRequest}
          />
        )}

        {activeTab === 'home' && isDesktop && (
          <div className="max-w-[1380px] mx-auto px-8 space-y-6">
            <div className="grid grid-cols-12 gap-6 items-stretch h-[calc(100vh-116px)] min-h-[690px] max-h-[820px]">
              <div className="col-span-4 min-h-0 flex flex-col">
                <DiscoverPanel
                  lots={filteredDemoLots}
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

            <DailyRatesChart
              lots={allLots}
              selectedLotId={selectedLot.id}
              activeBookedBayKeys={activeBookedBayKeys}
              referencePosition={userPosition}
              onSelectLot={(id) => handleSelectLot(id, false)}
            />
          </div>
        )}

        {activeTab === 'home' && !isDesktop && (
          <div className="max-w-[520px] mx-auto min-h-screen bg-white">
            {mobileScreen === 'home' && (
              <div key="mobile-home" className="min-h-screen screen-enter">
                <DiscoverPanel
                  lots={filteredDemoLots}
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

        {activeTab === 'settings' && (
          <SettingsBookingsView
            bookings={bookings}
            lots={allLots}
            favoriteIds={favoriteSet}
            vehicles={vehicles}
            preferences={preferences}
            priceReports={priceReports}
            activeBookedBayKeys={activeBookedBayKeys}
            onCancelBooking={handleCancelBooking}
            onShowPass={handleShowPass}
            onOpenLot={(id) => {
              handleSelectLot(id, false);
              setDrawerLotId(id);
              setActiveTab('map');
            }}
            onAddVehicle={handleAddVehicle}
            onDeleteVehicle={handleDeleteVehicle}
            onTogglePreference={handleTogglePreference}
          />
        )}
      </main>

      {/* Mobile Bottom Pill Navigation */}
      {showMobileBottomBar && (
        <MobileBottomNav
          activeTab={activeTab}
          onSelectTab={handleTabChange}
          activeBookingCount={activeBookingCount}
        />
      )}

      {/* Detailed Facility Information Drawer */}
      <FacilityDetailDrawer
        lot={drawerLot}
        isFavorite={drawerLot ? favoriteSet.has(drawerLot.id) : false}
        userPosition={userPosition}
        existingReports={priceReports}
        onClose={() => setDrawerLotId(null)}
        onToggleFavorite={handleToggleFavorite}
        onRequestDirections={(lot) => {
          setDrawerLotId(null);
          setActiveTab('map');
          setExternalRouteRequest((prev) => ({
            lot,
            seq: (prev?.seq ?? 0) + 1,
          }));
        }}
        onOpenDemoReserve={(lotId) => {
          setDrawerLotId(null);
          handleSelectLot(lotId, false);
          setActiveTab('home');
          setMobileScreen('select-space');
          setHighlightSpacePanel(true);
          window.setTimeout(() => setHighlightSpacePanel(false), 1200);
        }}
        onSubmitPriceReport={handleSubmitPriceReport}
      />

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

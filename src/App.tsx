import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookingModal } from './components/BookingModal';
import { DailyRatesChart } from './components/DailyRatesChart';
import { DetailsPanel } from './components/DetailsPanel';
import { DiscoverPanel } from './components/DiscoverPanel';
import { DriveVehicleModal } from './components/DriveVehicleModal';
import { FacilityDetailDrawer } from './components/FacilityDetailDrawer';
import { MapExplorerView } from './components/MapExplorerView';
import {
  DesktopTopBar,
  MobileBottomNav,
  MobileTopHeader,
} from './components/NavigationChrome';
import { SettingsBookingsView } from './components/SettingsBookingsView';
import { SpaceSelectorPanel } from './components/SpaceSelectorPanel';
import { INITIAL_VEHICLES, PARKING_LOTS, PHNOM_PENH_CENTER } from './data/parkingLots';
import type {
  ActiveTab,
  AvailabilityStatus,
  BookingRecord,
  DriveVehicleMode,
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
  findNearestCompatibleParking,
  getActiveBookedBayKeys,
} from './utils/parkingLogic';

const STORAGE_KEYS = {
  bookings: 'parkeasy_pp_bookings_v1',
  favorites: 'parkeasy_pp_favorites_v1',
  vehicles: 'parkeasy_pp_vehicles_v1',
  preferences: 'parkeasy_pp_preferences_v1',
  priceReports: 'parkeasy_pp_price_reports_v1',
  driveVehicle: 'parkeasy_pp_drive_vehicle_v1',
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

type ViewportTier = 'mobile' | 'tablet' | 'desktop';

function getViewportTier(): ViewportTier {
  if (typeof window === 'undefined') return 'desktop';
  if (window.innerWidth >= 1024) return 'desktop';
  if (window.innerWidth >= 768) return 'tablet';
  return 'mobile';
}

function useViewportTier(): ViewportTier {
  const [tier, setTier] = useState<ViewportTier>(getViewportTier);

  useEffect(() => {
    const handleResize = () => setTier(getViewportTier());
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return tier;
}

export default function App() {
  const viewportTier = useViewportTier();
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
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
    origin?: google.maps.LatLngLiteral;
    note?: string;
    seq: number;
  } | null>(null);
  const [driveVehicle, setDriveVehicle] = useState<DriveVehicleMode | null>(() => {
    const saved = loadFromStorage<DriveVehicleMode | null>(
      STORAGE_KEYS.driveVehicle,
      null
    );
    return saved === 'car' || saved === 'motorcycle' ? saved : null;
  });
  const [vehiclePromptOpen, setVehiclePromptOpen] = useState(false);
  const [findingNearest, setFindingNearest] = useState(false);

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

  useEffect(() => {
    try {
      if (driveVehicle) {
        window.localStorage.setItem(
          STORAGE_KEYS.driveVehicle,
          JSON.stringify(driveVehicle)
        );
      } else {
        window.localStorage.removeItem(STORAGE_KEYS.driveVehicle);
      }
    } catch {
      // ignore quota errors
    }
  }, [driveVehicle]);

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

  const routeToNearestForVehicle = useCallback(
    (vehicle: DriveVehicleMode) => {
      const dispatchRoute = (
        origin: google.maps.LatLngLiteral,
        usedGps: boolean
      ) => {
        const nearest = findNearestCompatibleParking(allLots, origin, vehicle);
        setFindingNearest(false);
        if (!nearest) return;

        handleSelectLot(nearest.lot.id, false);
        setActiveTab('map');
        const modeWord = vehicle === 'motorcycle' ? 'Moto' : 'Car';
        const originNote = usedGps
          ? 'your GPS location'
          : 'central Phnom Penh (enable GPS for exact origin)';
        setExternalRouteRequest((prev) => ({
          lot: nearest.lot,
          origin,
          note: `Nearest ${modeWord} parking: ${nearest.lot.name} (${nearest.distanceKm.toFixed(1)} km from ${originNote}).`,
          seq: (prev?.seq ?? 0) + 1,
        }));
      };

      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        setFindingNearest(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            };
            setUserPosition(coords);
            dispatchRoute(coords, true);
          },
          () => {
            dispatchRoute(userPosition ?? PHNOM_PENH_CENTER, Boolean(userPosition));
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        dispatchRoute(userPosition ?? PHNOM_PENH_CENTER, Boolean(userPosition));
      }
    },
    [allLots, handleSelectLot, userPosition]
  );

  const handleRequestNearestDrive = useCallback(() => {
    if (!driveVehicle) {
      setVehiclePromptOpen(true);
      return;
    }
    routeToNearestForVehicle(driveVehicle);
  }, [driveVehicle, routeToNearestForVehicle]);

  const handleSelectDriveVehicle = useCallback(
    (vehicle: DriveVehicleMode) => {
      setDriveVehicle(vehicle);
      setVehiclePromptOpen(false);
      routeToNearestForVehicle(vehicle);
    },
    [routeToNearestForVehicle]
  );

  const handleChangeDriveVehicle = useCallback((vehicle: DriveVehicleMode) => {
    setDriveVehicle(vehicle);
  }, []);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'home') {
      setMobileScreen('home');
    }
  };

  const showMobileBottomBar =
    viewportTier === 'mobile' && (activeTab !== 'home' || mobileScreen === 'home');

  return (
    <div className="min-h-dvh flex flex-col bg-[#F6F8F3] text-[#141517]">
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota or API restriction reached. You can still explore all Phnom Penh parking rates and EV stations in the directory panel.
          </span>
        </div>
      )}

      {/* Tablet & Desktop Top Bar */}
      <DesktopTopBar
        activeTab={activeTab}
        onSelectTab={handleTabChange}
        activeBookingCount={activeBookingCount}
        favoriteCount={favoriteIds.length}
        onQuickBook={() => {
          setActiveTab('home');
          handleOpenBookingModal();
        }}
      />

      {/* Mobile Compact Header + Hamburger Drawer */}
      <MobileTopHeader
        activeTab={activeTab}
        onSelectTab={handleTabChange}
        activeBookingCount={activeBookingCount}
        favoriteCount={favoriteIds.length}
        totalLocationCount={allLots.length}
        selectedLotName={selectedLot.name}
        onQuickBook={() => {
          setActiveTab('home');
          handleOpenBookingModal();
        }}
        onOpenBayDemo={() => {
          setActiveTab('home');
          setMobileScreen('select-space');
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full md:py-4">
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
            driveVehicle={driveVehicle}
            findingNearest={findingNearest}
            onRequestNearestDrive={handleRequestNearestDrive}
            onChangeDriveVehicle={handleChangeDriveVehicle}
          />
        )}

        {activeTab === 'home' && (
          <div className="w-full max-w-[1440px] 2xl:max-w-[1600px] mx-auto md:px-4 lg:px-6 xl:px-8">
            {mobileScreen === 'home' && (
              <div key="home-discover" className="screen-enter pb-24 md:pb-8 space-y-5 lg:space-y-6">
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
                  driveVehicle={driveVehicle}
                  findingNearest={findingNearest}
                  onRequestNearestDrive={handleRequestNearestDrive}
                  onChangeDriveVehicle={handleChangeDriveVehicle}
                />
                <div className="px-3.5 sm:px-0">
                  <DailyRatesChart
                    lots={allLots}
                    selectedLotId={selectedLot.id}
                    activeBookedBayKeys={activeBookedBayKeys}
                    referencePosition={userPosition}
                    onSelectLot={(id) => handleSelectLot(id, true)}
                    compact={viewportTier === 'mobile'}
                  />
                </div>
              </div>
            )}

            {mobileScreen !== 'home' && viewportTier !== 'mobile' && (
              <div
                key="home-inspector-desktop"
                className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch md:h-[clamp(580px,calc(100dvh-108px),820px)] screen-enter"
              >
                <div className="md:col-span-6 min-h-0 flex flex-col">
                  <DetailsPanel
                    lot={selectedLot}
                    isFavorite={favoriteSet.has(selectedLot.id)}
                    onToggleFavorite={handleToggleFavorite}
                    activeBookedBayKeys={activeBookedBayKeys}
                    onBack={() => setMobileScreen('home')}
                    onSelectSpace={handleSelectSpaceAction}
                    onOpenOnMap={(id) => {
                      handleSelectLot(id, false);
                      setActiveTab('map');
                    }}
                    isDesktop
                  />
                </div>

                <div ref={spaceColumnRef} className="md:col-span-6 min-h-0 flex flex-col">
                  <SpaceSelectorPanel
                    lot={selectedLot}
                    activeFloor={activeFloor}
                    onFloorChange={setActiveFloor}
                    selectedBayId={selectedBayId}
                    onSelectBay={(bay) => setSelectedBayId(bay.id)}
                    activeBookedBayKeys={activeBookedBayKeys}
                    onBack={() => setMobileScreen('home')}
                    onBookNow={handleOpenBookingModal}
                    highlighted={highlightSpacePanel}
                    isDesktop
                  />
                </div>
              </div>
            )}

            {mobileScreen === 'details' && viewportTier === 'mobile' && (
              <div
                key="home-details"
                className="min-h-[calc(100dvh-56px)] screen-enter"
              >
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

            {mobileScreen === 'select-space' && viewportTier === 'mobile' && (
              <div
                key="home-select-space"
                ref={spaceColumnRef}
                className="min-h-[calc(100dvh-56px)] screen-enter"
              >
                <SpaceSelectorPanel
                  lot={selectedLot}
                  activeFloor={activeFloor}
                  onFloorChange={setActiveFloor}
                  selectedBayId={selectedBayId}
                  onSelectBay={(bay) => setSelectedBayId(bay.id)}
                  activeBookedBayKeys={activeBookedBayKeys}
                  onBack={() => setMobileScreen('details')}
                  onBookNow={handleOpenBookingModal}
                  highlighted={highlightSpacePanel}
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

      {/* First-Time Vehicle Selection Prompt for Nearest Parking & Drive */}
      <DriveVehicleModal
        isOpen={vehiclePromptOpen}
        onSelectVehicle={handleSelectDriveVehicle}
        onClose={() => setVehiclePromptOpen(false)}
      />
    </div>
  );
}

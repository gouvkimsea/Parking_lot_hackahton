import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  APILoadingStatus,
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  AlertCircle,
  Clock,
  Crosshair,
  Heart,
  Layers,
  Loader2,
  MapPin,
  Navigation,
  Route as RouteIcon,
  Search,
  X,
} from 'lucide-react';
import type { ParkingLot, VehicleCategory } from '../types/parking';
import {
  calculateDistanceKm,
  countAvailableSpaces,
  findNearestParkingLot,
  formatCurrency,
} from '../utils/parkingLogic';

interface MapExplorerViewProps {
  lots: ParkingLot[];
  allLots: ParkingLot[];
  selectedLotId: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeCategory: VehicleCategory | 'all';
  onCategoryChange: (cat: VehicleCategory | 'all') => void;
  favoriteIds: Set<string>;
  onToggleFavorite: (lotId: string) => void;
  activeBookedBayKeys: Set<string>;
  onSelectLot: (lotId: string) => void;
  onOpenDetails: (lotId: string) => void;
  onOpenSelectSpace: (lotId: string) => void;
}

const MAP_CATEGORIES: Array<{ id: VehicleCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'car', label: 'Car' },
  { id: 'bike', label: 'Bike' },
  { id: 'bus', label: 'Bus' },
  { id: 'ev', label: 'EV' },
];

const DEFAULT_CENTER: google.maps.LatLngLiteral = {
  lat: 37.7872,
  lng: -122.4018,
};

const Z_INDEX_SELECTED = 1000;
const Z_INDEX_HOVER = 999;

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

function isQuotaError(err: unknown): boolean {
  const msg = String(err ?? '');
  return (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('OverQuotaMapError') ||
    msg.includes('QuotaExceededError') ||
    msg.includes('429')
  );
}

interface SearchedPlaceResult {
  name: string;
  address: string;
  position: google.maps.LatLngLiteral;
}

interface RouteSummary {
  distanceText: string;
  durationText: string;
  lotId: string;
}

interface ParkingMarkerItemProps {
  lot: ParkingLot;
  isSelected: boolean;
  isHovered: boolean;
  baseZIndex: number;
  openCount: number;
  showInfoWindow: boolean;
  onHoverChange: (hovered: boolean) => void;
  onSelect: () => void;
  onCloseInfoWindow: () => void;
  onSelectSpace: () => void;
}

const ParkingMarkerItem: React.FC<ParkingMarkerItemProps> = ({
  lot,
  isSelected,
  isHovered,
  baseZIndex,
  openCount,
  showInfoWindow,
  onHoverChange,
  onSelect,
  onCloseInfoWindow,
  onSelectSpace,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  const zIndex = isSelected
    ? Z_INDEX_SELECTED
    : isHovered
      ? Z_INDEX_HOVER
      : baseZIndex;

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={lot.position}
        zIndex={zIndex}
        title={`${lot.name} — ${formatCurrency(lot.pricePerHour)}/hr`}
        onClick={onSelect}
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
      >
        <button
          type="button"
          aria-label={`${lot.name}, ${formatCurrency(lot.pricePerHour)} per hour, ${openCount} spaces open`}
          aria-pressed={isSelected}
          className={`px-3.5 py-2 rounded-full text-[13px] font-bold tabular-nums transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517] ${
            isSelected
              ? 'bg-[#C5EC45] text-[#141517] scale-110 shadow-[0_10px_24px_rgba(20,21,23,0.28)] ring-2 ring-[#141517]'
              : 'bg-white text-[#141517] hover:bg-[#141517] hover:text-white shadow-[0_6px_16px_rgba(20,21,23,0.18)] border border-black/10'
          }`}
        >
          <span>${lot.pricePerHour}</span>
          <span className="text-[10px] font-medium opacity-80">/hr</span>
        </button>
      </AdvancedMarker>

      {showInfoWindow && marker && (
        <InfoWindow
          anchor={marker}
          onCloseClick={onCloseInfoWindow}
          pixelOffset={[0, -6]}
          maxWidth={240}
        >
          <div className="p-1 font-sans text-[#141517]">
            <p className="text-[14px] font-bold leading-snug">{lot.name}</p>
            <p className="text-[12px] text-[#6B7280] mt-0.5">{lot.address}</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-[12px] font-semibold tabular-nums">
                {formatCurrency(lot.pricePerHour)}/hr · {openCount} open
              </span>
              <button
                type="button"
                onClick={onSelectSpace}
                className="px-2.5 py-1 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[11px] font-bold whitespace-nowrap"
              >
                Pick Bay
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

interface GoogleMapCanvasProps {
  lots: ParkingLot[];
  activeLot: ParkingLot;
  activeBookedBayKeys: Set<string>;
  mapType: 'roadmap' | 'hybrid';
  userPosition: google.maps.LatLngLiteral | null;
  searchedPlace: SearchedPlaceResult | null;
  routeTrigger: { lot: ParkingLot; origin: google.maps.LatLngLiteral; seq: number } | null;
  placeSearchTrigger: { query: string; seq: number } | null;
  recenterSeq: number;
  centerOnUserSeq: number;
  onSelectLot: (lotId: string) => void;
  onOpenSelectSpace: (lotId: string) => void;
  onSearchedPlace: (place: SearchedPlaceResult | null, statusMsg: string | null) => void;
  onRouteComputed: (summary: RouteSummary | null, errorMsg: string | null) => void;
}

const GoogleMapCanvas: React.FC<GoogleMapCanvasProps> = ({
  lots,
  activeLot,
  activeBookedBayKeys,
  mapType,
  userPosition,
  searchedPlace,
  routeTrigger,
  placeSearchTrigger,
  recenterSeq,
  centerOnUserSeq,
  onSelectLot,
  onOpenSelectSpace,
  onSearchedPlace,
  onRouteComputed,
}) => {
  const map = useMap();
  const status = useApiLoadingStatus();
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');

  const [hoveredLotId, setHoveredLotId] = useState<string | null>(null);
  const [infoWindowLotId, setInfoWindowLotId] = useState<string | null>(null);
  const activePolylinesRef = useRef<google.maps.Polyline[]>([]);

  // Sort markers descending by latitude so southern markers render visually in front
  const sortedLots = useMemo(
    () => [...lots].sort((a, b) => b.position.lat - a.position.lat),
    [lots]
  );

  const clearRoutePolylines = useCallback(() => {
    for (const poly of activePolylinesRef.current) {
      poly.setMap(null);
    }
    activePolylinesRef.current = [];
  }, []);

  // Cleanup route polylines on unmount
  useEffect(() => {
    return () => clearRoutePolylines();
  }, [clearRoutePolylines]);

  // Smoothly pan when activeLot changes
  useEffect(() => {
    if (!map || !activeLot) return;
    map.panTo(activeLot.position);
  }, [map, activeLot]);

  // Recenter camera on downtown garages when requested
  useEffect(() => {
    if (!map || recenterSeq === 0) return;
    clearRoutePolylines();
    onRouteComputed(null, null);
    map.panTo(DEFAULT_CENTER);
    map.setZoom(15);
  }, [map, recenterSeq, clearRoutePolylines, onRouteComputed]);

  // Center map directly on the user's live geolocation when requested
  useEffect(() => {
    if (!map || centerOnUserSeq === 0 || !userPosition) return;
    map.panTo(userPosition);
    map.setZoom(15);
  }, [map, centerOnUserSeq, userPosition]);

  // Modern Places API (New) text search when user explicitly searches on Google Maps
  useEffect(() => {
    if (!placeSearchTrigger || !placesLib || !map) return;
    const query = placeSearchTrigger.query.trim();
    if (!query) return;

    let cancelled = false;
    (async () => {
      try {
        const center = map.getCenter()?.toJSON() ?? DEFAULT_CENTER;
        // Modern Places API (New): Place.searchByText via useMapsLibrary('places')
        // Docs: https://developers.google.com/maps/documentation/javascript/place-search?utm_campaign=gmp_mcp_codeassist_v1_aistudio
        const response = await placesLib.Place.searchByText({
          textQuery: query,
          fields: ['id', 'displayName', 'formattedAddress', 'location'],
          locationBias: {
            center,
            radius: 15000,
          },
          maxResultCount: 1,
        });

        if (cancelled) return;
        const topPlace = response.places?.[0];
        if (!topPlace || !topPlace.location) {
          onSearchedPlace(null, `No Google Maps location found for "${query}".`);
          return;
        }

        const pos = topPlace.location.toJSON();
        map.panTo(pos);
        map.setZoom(15);
        onSearchedPlace(
          {
            name: topPlace.displayName || query,
            address: topPlace.formattedAddress || 'Location on Google Maps',
            position: pos,
          },
          null
        );
      } catch (err) {
        if (cancelled) return;
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        onSearchedPlace(
          null,
          'Unable to search Google Maps right now. Filtering local parking garages instead.'
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [placeSearchTrigger, placesLib, map, onSearchedPlace]);

  // Modern Routes API: Route.computeRoutes via useMapsLibrary('routes')
  // Docs: https://developers.google.com/maps/documentation/javascript/routes?utm_campaign=gmp_mcp_codeassist_v1_aistudio
  useEffect(() => {
    if (!routeTrigger || !routesLib || !map) return;

    let cancelled = false;
    (async () => {
      clearRoutePolylines();
      try {
        const RouteCtor = routesLib.Route as unknown as {
          computeRoutes?: (
            req: Record<string, unknown>
          ) => Promise<{
            routes?: Array<{
              distanceMeters?: number;
              durationMillis?: number;
              localizedValues?: {
                distance?: string;
                duration?: string;
              };
              path?: google.maps.LatLng[];
              viewport?: google.maps.LatLngBounds;
              createPolylines?: (opts?: Record<string, unknown>) => google.maps.Polyline[];
            }>;
          }>;
        };

        if (typeof RouteCtor?.computeRoutes !== 'function') {
          onRouteComputed(null, 'Routes service is still loading. Try again in a moment.');
          return;
        }

        const response = await RouteCtor.computeRoutes({
          origin: routeTrigger.origin,
          destination: routeTrigger.lot.position,
          travelMode: 'DRIVING',
          fields: ['path', 'distanceMeters', 'durationMillis', 'localizedValues', 'viewport'],
        });

        if (cancelled) return;
        const primaryRoute = response?.routes?.[0];
        if (!primaryRoute) {
          onRouteComputed(null, 'No driving route found to this parking facility.');
          return;
        }

        if (typeof primaryRoute.createPolylines === 'function') {
          const polylines = primaryRoute.createPolylines({
            polylineOptions: {
              strokeColor: '#141517',
              strokeOpacity: 0.92,
              strokeWeight: 5,
            },
          });
          for (const poly of polylines) {
            poly.setMap(map);
          }
          activePolylinesRef.current = polylines;
        } else if (primaryRoute.path && primaryRoute.path.length > 0) {
          const poly = new google.maps.Polyline({
            path: primaryRoute.path,
            strokeColor: '#141517',
            strokeOpacity: 0.92,
            strokeWeight: 5,
            map,
          });
          activePolylinesRef.current = [poly];
        }

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport, 60);
        }

        const distanceText =
          primaryRoute.localizedValues?.distance ||
          (primaryRoute.distanceMeters
            ? `${(primaryRoute.distanceMeters / 1000).toFixed(1)} km`
            : 'Nearby');
        const durationText =
          primaryRoute.localizedValues?.duration ||
          (primaryRoute.durationMillis
            ? `${Math.max(1, Math.round(primaryRoute.durationMillis / 60000))} min`
            : 'Few mins');

        onRouteComputed(
          {
            distanceText,
            durationText,
            lotId: routeTrigger.lot.id,
          },
          null
        );
      } catch (err) {
        if (cancelled) return;
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        onRouteComputed(
          null,
          'Unable to calculate live driving directions right now.'
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [routeTrigger, routesLib, map, clearRoutePolylines, onRouteComputed]);

  if (
    status === APILoadingStatus.FAILED ||
    status === APILoadingStatus.AUTH_FAILURE
  ) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#F2F4EF] p-6 text-center gap-2.5">
        <AlertCircle className="w-8 h-8 text-[#B45309]" />
        <p className="text-[15px] font-bold text-[#141517]">
          Unable to load Google Maps
        </p>
        <p className="text-[13px] text-[#6B7280] max-w-sm">
          Please check your network connection or Google Maps API key configuration.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {status === APILoadingStatus.LOADING && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#F2F4EF]/90">
          <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white shadow-sm text-[13px] font-semibold text-[#141517]">
            <Loader2 className="w-4 h-4 animate-spin text-[#5A760E]" />
            <span>Loading Google Maps…</span>
          </div>
        </div>
      )}

      <GoogleMap
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        defaultCenter={activeLot?.position ?? DEFAULT_CENTER}
        defaultZoom={15}
        mapTypeId={mapType}
        gestureHandling="greedy"
        streetViewControl={false}
        mapTypeControl={false}
        fullscreenControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        {/* User Geolocation Marker (only shown after user clicks My Location) */}
        {userPosition && (
          <AdvancedMarker
            position={userPosition}
            zIndex={950}
            title="Your current location"
          >
            <div className="w-9 h-9 rounded-full bg-[#141517]/15 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-[#2563EB] border-[3px] border-white shadow-md" />
            </div>
          </AdvancedMarker>
        )}

        {/* Searched Google Maps Place Marker */}
        {searchedPlace && (
          <AdvancedMarker
            position={searchedPlace.position}
            zIndex={960}
            title={searchedPlace.name}
          >
            <div className="px-3 py-1.5 rounded-full bg-[#141517] text-white text-[12px] font-semibold shadow-lg flex items-center gap-1.5 border border-white/20">
              <MapPin className="w-3.5 h-3.5 text-[#C5EC45]" />
              <span className="max-w-[160px] truncate">{searchedPlace.name}</span>
            </div>
          </AdvancedMarker>
        )}

        {/* PrestigePark Facility Markers */}
        {sortedLots.map((lot, idx) => {
          const isSelected = lot.id === activeLot.id;
          const openCount = countAvailableSpaces(lot, activeBookedBayKeys);
          return (
            <ParkingMarkerItem
              key={lot.id}
              lot={lot}
              isSelected={isSelected}
              isHovered={hoveredLotId === lot.id}
              baseZIndex={idx + 1}
              openCount={openCount}
              showInfoWindow={infoWindowLotId === lot.id}
              onHoverChange={(hovered) =>
                setHoveredLotId(hovered ? lot.id : null)
              }
              onSelect={() => {
                onSelectLot(lot.id);
                setInfoWindowLotId(lot.id);
              }}
              onCloseInfoWindow={() => setInfoWindowLotId(null)}
              onSelectSpace={() => onOpenSelectSpace(lot.id)}
            />
          );
        })}
      </GoogleMap>
    </div>
  );
};

export const MapExplorerView: React.FC<MapExplorerViewProps> = ({
  lots,
  allLots,
  selectedLotId,
  searchQuery,
  onSearchChange,
  activeCategory,
  onCategoryChange,
  favoriteIds,
  onToggleFavorite,
  activeBookedBayKeys,
  onSelectLot,
  onOpenDetails,
  onOpenSelectSpace,
}) => {
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [userPosition, setUserPosition] = useState<google.maps.LatLngLiteral | null>(
    null
  );
  const [locating, setLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [searchedPlace, setSearchedPlace] = useState<SearchedPlaceResult | null>(
    null
  );
  const [placeSearchTrigger, setPlaceSearchTrigger] = useState<{
    query: string;
    seq: number;
  } | null>(null);
  const [routeTrigger, setRouteTrigger] = useState<{
    lot: ParkingLot;
    origin: google.maps.LatLngLiteral;
    seq: number;
  } | null>(null);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [recenterSeq, setRecenterSeq] = useState(0);
  const [centerOnUserSeq, setCenterOnUserSeq] = useState(0);

  const activeLot =
    lots.find((l) => l.id === selectedLotId) ?? lots[0] ?? allLots[0];
  const activeAvailable = countAvailableSpaces(activeLot, activeBookedBayKeys);

  const nearestToUser = useMemo(() => {
    if (!userPosition) return null;
    return findNearestParkingLot(lots.length > 0 ? lots : allLots, userPosition);
  }, [userPosition, lots, allLots]);

  const activeDistanceKm = useMemo(() => {
    if (userPosition) {
      return calculateDistanceKm(userPosition, activeLot.position);
    }
    return activeLot.distanceKm;
  }, [userPosition, activeLot]);

  const handleCenterOnMyLocation = () => {
    if (!navigator.geolocation) {
      setStatusMessage('Geolocation is not supported in this browser.');
      return;
    }
    setLocating(true);
    setStatusMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserPosition(coords);
        setLocating(false);
        setCenterOnUserSeq((s) => s + 1);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setStatusMessage(
            'Location access was denied. Enable browser location permissions to center on your position.'
          );
        } else {
          setStatusMessage(
            'Unable to determine your current location right now. Showing Downtown District garages.'
          );
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchedPlace(null);
      setStatusMessage(null);
      return;
    }
    setStatusMessage(null);
    setPlaceSearchTrigger((prev) => ({
      query: trimmed,
      seq: (prev?.seq ?? 0) + 1,
    }));
  };

  const handleRequestDirections = () => {
    setStatusMessage(null);
    setRouteTrigger((prev) => ({
      lot: activeLot,
      origin: userPosition ?? DEFAULT_CENTER,
      seq: (prev?.seq ?? 0) + 1,
    }));
  };

  const handleSearchedPlaceResult = useCallback(
    (place: SearchedPlaceResult | null, msg: string | null) => {
      setSearchedPlace(place);
      setStatusMessage(msg);
    },
    []
  );

  const handleRouteComputed = useCallback(
    (summary: RouteSummary | null, errMsg: string | null) => {
      setRouteSummary(summary);
      if (errMsg) setStatusMessage(errMsg);
    },
    []
  );

  return (
    <section
      aria-label="Interactive Google Maps Parking Explorer"
      className="max-w-[1360px] mx-auto w-full px-0 sm:px-5 lg:px-6 xl:px-8 pb-24 md:pb-8"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left/Main Live Google Maps Panel */}
        <div className="lg:col-span-8 bg-white sm:rounded-[32px] shadow-[0_14px_40px_rgba(20,21,23,0.06)] border border-black/[0.04] overflow-hidden flex flex-col">
          {/* Map Top Search & Category Filter */}
          <div className="p-4 sm:p-5 border-b border-[#F0F1F3] flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <form onSubmit={handleSearchSubmit} className="relative flex-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search
                    className="w-4 h-4 text-[#767B84] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <label htmlFor="map-search-input" className="sr-only">
                    Search Google Maps location or garage
                  </label>
                  <input
                    id="map-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      onSearchChange(e.target.value);
                      if (!e.target.value.trim()) {
                        setSearchedPlace(null);
                        setStatusMessage(null);
                      }
                    }}
                    placeholder="Search street, landmark, or garage"
                    className="w-full h-11 pl-10 pr-9 rounded-full bg-[#F4F5F6] text-[14px] text-[#141517] placeholder:text-[#8E939B] focus:outline-none focus:ring-2 focus:ring-[#C5EC45] focus:bg-white transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        onSearchChange('');
                        setSearchedPlace(null);
                        setStatusMessage(null);
                      }}
                      aria-label="Clear map search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-[#767B84] hover:text-[#141517]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="h-11 px-4 rounded-full bg-[#141517] hover:bg-[#2A2D32] text-white text-[13px] font-semibold whitespace-nowrap shrink-0 transition-colors"
                >
                  Search Map
                </button>
              </form>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {MAP_CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => onCategoryChange(cat.id)}
                      className={`px-3.5 py-2 rounded-full text-[13px] font-medium whitespace-nowrap shrink-0 transition-all min-h-[40px] ${
                        isActive
                          ? 'bg-[#C5EC45] text-[#141517] font-semibold'
                          : 'bg-[#F4F5F6] text-[#6B7280] hover:text-[#141517]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {statusMessage && (
              <p role="status" className="text-[12.5px] text-[#525760] px-1">
                {statusMessage}
              </p>
            )}

            {userPosition && nearestToUser && !statusMessage && (
              <div
                role="status"
                className="flex items-center justify-between gap-2 text-[12.5px] text-[#525760] px-1 flex-wrap"
              >
                <span>
                  Centered on your location · Closest garage:{' '}
                  <strong className="font-semibold text-[#141517]">
                    {nearestToUser.lot.name}
                  </strong>{' '}
                  <span className="tabular-nums">
                    ({nearestToUser.distanceKm.toFixed(1)} km away)
                  </span>
                </span>
                {nearestToUser.lot.id !== activeLot.id && (
                  <button
                    type="button"
                    onClick={() => onSelectLot(nearestToUser.lot.id)}
                    className="text-[12px] font-semibold text-[#141517] underline hover:text-[#4D6A0A] whitespace-nowrap"
                  >
                    Focus Closest
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Live Google Maps Container (Explicit Height adapted to laptop/desktop screens) */}
          <div className="relative h-[400px] sm:h-[440px] md:h-[clamp(390px,calc(100vh-270px),540px)] w-full bg-[#EEF2EB] overflow-hidden">
            {MAPS_API_KEY ? (
              <APIProvider
                apiKey={MAPS_API_KEY}
                libraries={['marker', 'places', 'routes']}
                language="en"
                region="US"
              >
                <GoogleMapCanvas
                  lots={lots}
                  activeLot={activeLot}
                  activeBookedBayKeys={activeBookedBayKeys}
                  mapType={mapType}
                  userPosition={userPosition}
                  searchedPlace={searchedPlace}
                  routeTrigger={routeTrigger}
                  placeSearchTrigger={placeSearchTrigger}
                  recenterSeq={recenterSeq}
                  centerOnUserSeq={centerOnUserSeq}
                  onSelectLot={onSelectLot}
                  onOpenSelectSpace={onOpenSelectSpace}
                  onSearchedPlace={handleSearchedPlaceResult}
                  onRouteComputed={handleRouteComputed}
                />
              </APIProvider>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center gap-2 bg-[#F2F4EF]">
                <MapPin className="w-8 h-8 text-[#525760]" />
                <p className="text-[15px] font-bold text-[#141517]">
                  Google Maps API key not configured
                </p>
                <p className="text-[13px] text-[#6B7280] max-w-sm">
                  Set VITE_GOOGLE_MAPS_API_KEY in your environment to display live Google Maps tiles.
                </p>
              </div>
            )}

            {/* Floating Map Utility Controls (Center on my location, Map Type, Recenter) */}
            <div className="absolute top-3.5 left-3.5 right-3.5 z-10 flex items-center gap-2 flex-wrap pointer-events-none">
              <button
                type="button"
                onClick={handleCenterOnMyLocation}
                disabled={locating}
                aria-label="Center on my location"
                className={`pointer-events-auto h-10 px-3.5 rounded-full text-[12.5px] font-semibold shadow-md flex items-center gap-1.5 transition-colors whitespace-nowrap disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517] ${
                  userPosition
                    ? 'bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517]'
                    : 'bg-white/95 hover:bg-white text-[#141517]'
                }`}
              >
                {locating ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <Crosshair className="w-4 h-4 shrink-0" />
                )}
                <span>{locating ? 'Locating…' : 'Center on my location'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setMapType((prev) => (prev === 'roadmap' ? 'hybrid' : 'roadmap'))
                }
                aria-label={
                  mapType === 'roadmap'
                    ? 'Switch to Satellite view'
                    : 'Switch to Road map view'
                }
                className="pointer-events-auto h-10 px-3.5 rounded-full bg-white/95 hover:bg-white text-[#141517] text-[12.5px] font-semibold shadow-md flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span>{mapType === 'roadmap' ? 'Satellite' : 'Map'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectLot('prestige-parking');
                  setSearchedPlace(null);
                  setStatusMessage(null);
                  setRecenterSeq((s) => s + 1);
                }}
                aria-label="Recenter map on downtown garages"
                className="pointer-events-auto h-10 px-3.5 rounded-full bg-white/95 hover:bg-white text-[#141517] text-[12.5px] font-semibold shadow-md flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Navigation className="w-4 h-4 shrink-0" />
                <span>Recenter</span>
              </button>
            </div>
          </div>

          {/* Quick Horizontal Garage Switcher for Accessible Selection */}
          <div className="px-4 py-3 border-t border-[#F0F1F3] bg-[#FAFAFA] flex items-center gap-2 overflow-x-auto no-scrollbar">
            {lots.map((lot) => {
              const isSelected = lot.id === activeLot.id;
              const lotDistKm = userPosition
                ? calculateDistanceKm(userPosition, lot.position)
                : null;
              return (
                <button
                  key={lot.id}
                  type="button"
                  onClick={() => onSelectLot(lot.id)}
                  className={`px-3.5 py-2 rounded-full text-[12.5px] whitespace-nowrap shrink-0 transition-all tabular-nums ${
                    isSelected
                      ? 'bg-[#C5EC45] text-[#141517] font-bold'
                      : 'bg-white text-[#525760] hover:text-[#141517] border border-black/[0.06] font-medium'
                  }`}
                >
                  {lot.name} · ${lot.pricePerHour}/hr
                  {lotDistKm !== null ? ` · ${lotDistKm.toFixed(1)} km` : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Selected Lot Summary Panel */}
        <div className="lg:col-span-4 bg-white sm:rounded-[32px] shadow-[0_14px_40px_rgba(20,21,23,0.06)] border border-black/[0.04] p-5 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-[#141517]">
                Selected Location
              </h2>
              <span className="text-[12px] text-[#767B84] tabular-nums">
                {lots.length} nearby
              </span>
            </div>

            <div className="relative rounded-[20px] overflow-hidden aspect-[16/10] bg-[#E8ECE6]">
              <img
                src={activeLot.images[0]}
                alt={activeLot.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-white/95 text-[#141517] px-3 py-1.5 rounded-full text-[11px] font-medium shadow-sm">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{activeLot.openHours}</span>
              </div>
              <button
                type="button"
                onClick={() => onToggleFavorite(activeLot.id)}
                aria-label={
                  favoriteIds.has(activeLot.id)
                    ? `Remove ${activeLot.name} from favorites`
                    : `Save ${activeLot.name} to favorites`
                }
                className="absolute top-2.5 right-2.5 w-10 h-10 rounded-full bg-white/95 flex items-center justify-center shadow-sm"
              >
                <Heart
                  className={`w-[18px] h-[18px] ${
                    favoriteIds.has(activeLot.id)
                      ? 'fill-[#EF4444] text-[#EF4444]'
                      : 'text-[#141517]'
                  }`}
                />
              </button>
            </div>

            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[19px] font-bold text-[#141517]">
                  {activeLot.name}
                </h3>
                <p className="text-[19px] font-extrabold text-[#141517] tabular-nums shrink-0">
                  {formatCurrency(activeLot.pricePerHour)}
                  <span className="text-[11px] font-medium text-[#767B84]">/hr</span>
                </p>
              </div>
              <p className="mt-1 text-[13px] text-[#767B84] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 shrink-0 text-[#525760]" />
                <span>{activeLot.address}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F4F5F6] rounded-[16px] py-3.5 px-3 text-center">
                <p className="text-[13px] font-bold text-[#141517]">Availability</p>
                <p className="text-[12.5px] text-[#767B84] mt-0.5 tabular-nums">
                  {activeAvailable} Space available
                </p>
              </div>
              <div className="bg-[#F4F5F6] rounded-[16px] py-3.5 px-3 text-center">
                <p className="text-[13px] font-bold text-[#141517]">
                  {routeSummary && routeSummary.lotId === activeLot.id
                    ? 'Drive Route'
                    : userPosition
                      ? 'From You'
                      : 'Distance'}
                </p>
                <p
                  data-testid="map-selected-distance"
                  className="text-[12.5px] text-[#767B84] mt-0.5 tabular-nums"
                >
                  {routeSummary && routeSummary.lotId === activeLot.id
                    ? `${routeSummary.durationText} · ${routeSummary.distanceText}`
                    : `${activeDistanceKm.toFixed(1)} km away`}
                </p>
              </div>
            </div>

            <p className="text-[13px] leading-[1.6] text-[#6B7280]">
              {activeLot.description}
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => onOpenSelectSpace(activeLot.id)}
              className="w-full h-12 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[14px] font-semibold transition-colors"
            >
              Select Space
            </button>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleRequestDirections}
                className="h-11 rounded-full bg-[#F4F5F6] hover:bg-[#E8EAED] text-[#141517] text-[13.5px] font-semibold transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <RouteIcon className="w-4 h-4" />
                <span>Directions</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenDetails(activeLot.id)}
                className="h-11 rounded-full bg-[#F4F5F6] hover:bg-[#E8EAED] text-[#141517] text-[13.5px] font-semibold transition-colors"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

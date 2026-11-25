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
  BatteryCharging,
  Bike,
  Car,
  ChevronDown,
  ChevronUp,
  Columns2,
  Compass,
  Crosshair,
  ExternalLink,
  Filter,
  Layers,
  List as ListIcon,
  Loader2,
  Map as MapIcon,
  MapPin,
  Navigation,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Route as RouteIcon,
  Search,
  Star,
  X,
  Zap,
} from 'lucide-react';
import { LeafletPhnomPenhMap } from './LeafletPhnomPenhMap';
import {
  PHNOM_PENH_CENTER,
  PHNOM_PENH_DISTRICTS,
  buildStandardDemoFloors,
} from '../data/parkingLots';
import type {
  AvailabilityStatus,
  DriveVehicleMode,
  EvFilterMode,
  FacilityType,
  MarkerColorVariant,
  ParkingLot,
  PriceBracketFilter,
  VehicleCategory,
} from '../types/parking';
import {
  AVAILABILITY_LABELS,
  FACILITY_TYPE_LABELS,
  VEHICLE_TYPE_LABELS,
  buildGoogleMapsDirectionsUrl,
  calculateDistanceKm,
  getCompactPriceDisplay,
  getMarkerColorVariant,
} from '../utils/parkingLogic';

interface MapExplorerViewProps {
  allLots: ParkingLot[];
  filteredLots: ParkingLot[];
  selectedLotId: string | null;
  searchQuery: string;
  selectedDistrict: string;
  vehicleType: VehicleCategory | 'all';
  priceBracket: PriceBracketFilter;
  facilityType: FacilityType | 'all';
  availabilityFilter: AvailabilityStatus | 'all';
  evFilter: EvFilterMode;
  nearUserOnly: boolean;
  userPosition: google.maps.LatLngLiteral | null;
  onSearchChange: (q: string) => void;
  onDistrictChange: (district: string) => void;
  onVehicleTypeChange: (cat: VehicleCategory | 'all') => void;
  onPriceBracketChange: (bracket: PriceBracketFilter) => void;
  onFacilityTypeChange: (type: FacilityType | 'all') => void;
  onAvailabilityFilterChange: (status: AvailabilityStatus | 'all') => void;
  onEvFilterChange: (mode: EvFilterMode) => void;
  onNearUserOnlyChange: (nearOnly: boolean) => void;
  onResetFilters: () => void;
  onUserPositionChange: (pos: google.maps.LatLngLiteral | null) => void;
  onSelectLot: (lotId: string) => void;
  onOpenDetails: (lotId: string) => void;
  onMergeGooglePlacesLots: (discovered: ParkingLot[]) => void;
  externalRouteRequest: {
    lot: ParkingLot;
    origin?: google.maps.LatLngLiteral;
    note?: string;
    seq: number;
  } | null;
  driveVehicle: DriveVehicleMode | null;
  findingNearest: boolean;
  onRequestNearestDrive: () => void;
  onChangeDriveVehicle: (vehicle: DriveVehicleMode) => void;
}

const VEHICLE_FILTER_OPTIONS: Array<{ id: VehicleCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All Vehicles' },
  { id: 'car', label: 'Car' },
  { id: 'motorcycle', label: 'Motorcycle' },
  { id: 'bicycle', label: 'Bicycle' },
  { id: 'ev', label: 'Electric Vehicle' },
];

const PRICE_FILTER_OPTIONS: Array<{ id: PriceBracketFilter; label: string }> = [
  { id: 'all', label: 'Any Price' },
  { id: 'free', label: 'Free parking' },
  { id: 'under_2000', label: 'Under 2,000 KHR/hr' },
  { id: '2000_to_5000', label: '2,000–5,000 KHR/hr' },
  { id: 'above_5000', label: 'Above 5,000 KHR/hr' },
];

const FACILITY_TYPE_FILTER_OPTIONS: Array<{ id: FacilityType | 'all'; label: string }> = [
  { id: 'all', label: 'All Types' },
  { id: 'mall', label: 'Shopping Mall' },
  { id: 'commercial', label: 'Commercial Building' },
  { id: 'hotel', label: 'Hotel / Resort' },
  { id: 'market', label: 'Market' },
  { id: 'hospital', label: 'Hospital / Clinic' },
  { id: 'university', label: 'University / Campus' },
  { id: 'entertainment', label: 'Dining / Entertainment' },
  { id: 'public', label: 'Public Lot' },
  { id: 'private', label: 'Private Facility' },
  { id: 'street', label: 'Street Parking' },
  { id: 'motorcycle_lot', label: 'Motorcycle Parking' },
  { id: 'ev_station', label: 'EV Charging Station' },
];

const AVAILABILITY_FILTER_OPTIONS: Array<{
  id: AvailabilityStatus | 'all';
  label: string;
}> = [
  { id: 'all', label: 'Any Availability' },
  { id: 'available', label: 'Available' },
  { id: 'limited', label: 'Limited spaces' },
  { id: 'full', label: 'Full' },
  { id: 'unknown', label: 'Unknown' },
];

const EV_FILTER_OPTIONS: Array<{ id: EvFilterMode; label: string }> = [
  { id: 'all', label: 'All EV Stations' },
  { id: 'available', label: 'Available' },
  { id: 'fast', label: 'Fast Charging' },
  { id: 'standard', label: 'Standard Charging' },
];

const MARKER_LEGEND: Array<{
  variant: MarkerColorVariant;
  label: string;
  dotClass: string;
}> = [
  { variant: 'blue', label: 'General', dotClass: 'bg-blue-600' },
  { variant: 'purple', label: 'Mall', dotClass: 'bg-purple-600' },
  { variant: 'green', label: 'Available', dotClass: 'bg-emerald-600' },
  { variant: 'orange', label: 'Limited', dotClass: 'bg-orange-500' },
  { variant: 'red', label: 'Full', dotClass: 'bg-red-600' },
  { variant: 'cyan', label: 'EV Station', dotClass: 'bg-cyan-500' },
];

const MARKER_STYLES: Record<
  MarkerColorVariant,
  { bg: string; text: string; ring: string }
> = {
  blue: {
    bg: 'bg-blue-600 hover:bg-blue-700',
    text: 'text-white',
    ring: 'ring-blue-300',
  },
  purple: {
    bg: 'bg-purple-600 hover:bg-purple-700',
    text: 'text-white',
    ring: 'ring-purple-300',
  },
  green: {
    bg: 'bg-emerald-600 hover:bg-emerald-700',
    text: 'text-white',
    ring: 'ring-emerald-300',
  },
  orange: {
    bg: 'bg-orange-500 hover:bg-orange-600',
    text: 'text-white',
    ring: 'ring-orange-300',
  },
  red: {
    bg: 'bg-red-600 hover:bg-red-700',
    text: 'text-white',
    ring: 'ring-red-300',
  },
  cyan: {
    bg: 'bg-cyan-500 hover:bg-cyan-600',
    text: 'text-[#083344]',
    ring: 'ring-cyan-200',
  },
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
  userPosition: google.maps.LatLngLiteral | null;
  showInfoWindow: boolean;
  onHoverChange: (hovered: boolean) => void;
  onSelect: () => void;
  onCloseInfoWindow: () => void;
  onDirections: () => void;
  onViewDetails: () => void;
}

const ParkingMarkerItem: React.FC<ParkingMarkerItemProps> = ({
  lot,
  isSelected,
  isHovered,
  baseZIndex,
  userPosition,
  showInfoWindow,
  onHoverChange,
  onSelect,
  onCloseInfoWindow,
  onDirections,
  onViewDetails,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const variant = getMarkerColorVariant(lot);
  const styles = MARKER_STYLES[variant];
  const priceDisplay = getCompactPriceDisplay(lot);
  const distanceKm = userPosition
    ? calculateDistanceKm(userPosition, lot.position)
    : null;

  const zIndex = isSelected
    ? Z_INDEX_SELECTED
    : isHovered
      ? Z_INDEX_HOVER
      : baseZIndex;

  const markerLabel =
    lot.facilityType === 'ev_station'
      ? lot.evCharging?.maxPowerKw
        ? `${lot.evCharging.maxPowerKw}kW`
        : 'EV'
      : lot.pricing.isFree && lot.pricePerHourKhr === 0
        ? 'Free'
        : lot.pricing.carHourly?.khr
          ? `${(lot.pricing.carHourly.khr / 1000).toFixed(lot.pricing.carHourly.khr % 1000 === 0 ? 0 : 1)}k`
          : lot.pricing.motorcycle?.khr
            ? `${(lot.pricing.motorcycle.khr / 1000).toFixed(0)}k`
            : 'P';

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={lot.position}
        zIndex={zIndex}
        title={`${lot.name} — ${priceDisplay.primaryText}`}
        onClick={onSelect}
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
      >
        <button
          type="button"
          aria-label={`${lot.name}, ${FACILITY_TYPE_LABELS[lot.facilityType]}, ${priceDisplay.primaryText}`}
          aria-pressed={isSelected}
          className={`px-2.5 py-1.5 rounded-full text-[11.5px] font-bold tabular-nums inline-flex items-center gap-1 transition-all duration-150 shadow-[0_6px_16px_rgba(20,21,23,0.24)] border border-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517] ${
            styles.bg
          } ${styles.text} ${
            isSelected ? `scale-115 ring-4 ${styles.ring}` : ''
          }`}
        >
          {lot.facilityType === 'ev_station' && (
            <Zap className="w-3.5 h-3.5 shrink-0 fill-current" aria-hidden="true" />
          )}
          <span>{markerLabel}</span>
        </button>
      </AdvancedMarker>

      {showInfoWindow && marker && (
        <InfoWindow
          anchor={marker}
          onCloseClick={onCloseInfoWindow}
          pixelOffset={[0, -8]}
          maxWidth={300}
        >
          <div className="p-1.5 font-sans text-[#141517] min-w-[235px] max-w-[280px] space-y-2">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#525760]">
                  {FACILITY_TYPE_LABELS[lot.facilityType]}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    lot.availability.status === 'available'
                      ? 'bg-emerald-50 text-emerald-700'
                      : lot.availability.status === 'limited'
                        ? 'bg-amber-50 text-amber-700'
                        : lot.availability.status === 'full'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {AVAILABILITY_LABELS[lot.availability.status]}
                  {lot.availability.availableSpaces !== null
                    ? ` (${lot.availability.availableSpaces})`
                    : ''}
                </span>
              </div>
              <p className="text-[14px] font-bold leading-snug mt-0.5">{lot.name}</p>
              <p className="text-[11.5px] text-[#6B7280]">{lot.district}, Phnom Penh</p>
            </div>

            <div className="bg-[#F6F7F8] rounded-xl px-2.5 py-2 space-y-1 text-[11.5px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#6B7280]">Price</span>
                <span className="font-bold text-[#141517] tabular-nums">
                  {priceDisplay.primaryText}
                  {priceDisplay.secondaryUsd ? ` (${priceDisplay.secondaryUsd})` : ''}
                </span>
              </div>
              {distanceKm !== null && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#6B7280]">Distance</span>
                  <span className="font-semibold text-[#141517] tabular-nums">
                    {distanceKm.toFixed(1)} km away
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#6B7280]">Vehicles</span>
                <span className="font-medium text-[#141517] text-right">
                  {lot.categories.map((c) => VEHICLE_TYPE_LABELS[c]).join(', ')}
                </span>
              </div>
              {lot.rating !== null && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#6B7280]">Rating</span>
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {lot.rating.toFixed(1)}
                    {lot.reviewCount !== null ? ` (${lot.reviewCount})` : ''}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={onDirections}
                className="px-2.5 py-1.5 rounded-full bg-[#F4F5F6] hover:bg-[#E5E7EB] text-[#141517] text-[11.5px] font-semibold inline-flex items-center justify-center gap-1"
              >
                <RouteIcon className="w-3.5 h-3.5" />
                Directions
              </button>
              <button
                type="button"
                onClick={onViewDetails}
                className="px-2.5 py-1.5 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[11.5px] font-bold"
              >
                View Details
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
  selectedLot: ParkingLot | null;
  focusLotTrigger: { lot: ParkingLot; seq: number } | null;
  mapType: 'roadmap' | 'hybrid';
  userPosition: google.maps.LatLngLiteral | null;
  searchedPlace: SearchedPlaceResult | null;
  routeTrigger: { lot: ParkingLot; origin: google.maps.LatLngLiteral; seq: number } | null;
  placeSearchTrigger: { query: string; seq: number } | null;
  placesDiscoverySeq: number;
  recenterSeq: number;
  onSelectLotFromMarker: (lotId: string) => void;
  onOpenDetails: (lotId: string) => void;
  onRequestDirections: (lot: ParkingLot) => void;
  onSearchedPlace: (place: SearchedPlaceResult | null, statusMsg: string | null) => void;
  onRouteComputed: (summary: RouteSummary | null, errorMsg: string | null) => void;
  onPlacesDiscovered: (places: ParkingLot[], msg: string) => void;
  onFallbackToOsm: () => void;
}

const GoogleMapCanvas: React.FC<GoogleMapCanvasProps> = ({
  lots,
  selectedLot,
  focusLotTrigger,
  mapType,
  userPosition,
  searchedPlace,
  routeTrigger,
  placeSearchTrigger,
  placesDiscoverySeq,
  recenterSeq,
  onSelectLotFromMarker,
  onOpenDetails,
  onRequestDirections,
  onSearchedPlace,
  onRouteComputed,
  onPlacesDiscovered,
  onFallbackToOsm,
}) => {
  const map = useMap();
  const status = useApiLoadingStatus();
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');

  const [hoveredLotId, setHoveredLotId] = useState<string | null>(null);
  const [infoWindowLotId, setInfoWindowLotId] = useState<string | null>(null);
  const activePolylinesRef = useRef<google.maps.Polyline[]>([]);

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

  useEffect(() => {
    return () => clearRoutePolylines();
  }, [clearRoutePolylines]);

  // Focus map and open InfoWindow when user clicks a parking lot from the left list
  useEffect(() => {
    if (!map || !focusLotTrigger) return;
    map.panTo(focusLotTrigger.lot.position);
    const currentZoom = map.getZoom() ?? 13;
    if (currentZoom < 14) {
      map.setZoom(15);
    }
    setInfoWindowLotId(focusLotTrigger.lot.id);
  }, [map, focusLotTrigger]);

  // Recenter camera to user location or Phnom Penh City Center
  useEffect(() => {
    if (!map || recenterSeq === 0) return;
    clearRoutePolylines();
    onRouteComputed(null, null);
    map.panTo(userPosition ?? PHNOM_PENH_CENTER);
    map.setZoom(userPosition ? 15 : 13);
  }, [map, recenterSeq, userPosition, clearRoutePolylines, onRouteComputed]);

  // Search locations, landmarks, streets in Phnom Penh via Google Places API (New)
  useEffect(() => {
    if (!placeSearchTrigger || !placesLib || !map) return;
    const query = placeSearchTrigger.query.trim();
    if (!query) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await placesLib.Place.searchByText({
          textQuery: `${query}, Phnom Penh, Cambodia`,
          fields: ['id', 'displayName', 'formattedAddress', 'location'],
          locationBias: {
            center: PHNOM_PENH_CENTER,
            radius: 16000,
          },
          region: 'KH',
          maxResultCount: 1,
        });

        if (cancelled) return;
        const topPlace = response.places?.[0];
        if (!topPlace || !topPlace.location) {
          onSearchedPlace(null, `No Phnom Penh map location found for "${query}".`);
          return;
        }

        const pos = topPlace.location.toJSON();
        map.panTo(pos);
        map.setZoom(15);
        onSearchedPlace(
          {
            name: topPlace.displayName || query,
            address: topPlace.formattedAddress || 'Phnom Penh, Cambodia',
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
          'Google Places search unavailable; filtering Phnom Penh directory locally.'
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [placeSearchTrigger, placesLib, map, onSearchedPlace]);

  // Discover real parking & EV charging facilities around map center via Google Places API (New)
  useEffect(() => {
    if (placesDiscoverySeq === 0 || !placesLib || !map) return;

    let cancelled = false;
    (async () => {
      try {
        const center = map.getCenter()?.toJSON() ?? PHNOM_PENH_CENTER;
        const [parkingRes, evRes] = await Promise.all([
          placesLib.Place.searchByText({
            textQuery: 'parking lot garage Phnom Penh',
            fields: [
              'id',
              'displayName',
              'formattedAddress',
              'location',
              'rating',
              'userRatingCount',
              'regularOpeningHours',
            ],
            locationBias: { center, radius: 6000 },
            region: 'KH',
            maxResultCount: 10,
          }),
          placesLib.Place.searchByText({
            textQuery: 'EV charging station Phnom Penh',
            fields: [
              'id',
              'displayName',
              'formattedAddress',
              'location',
              'rating',
              'userRatingCount',
              'regularOpeningHours',
            ],
            locationBias: { center, radius: 10000 },
            region: 'KH',
            maxResultCount: 8,
          }),
        ]);

        if (cancelled) return;

        const mapped: ParkingLot[] = [];
        const addMapped = (
          places: google.maps.places.Place[] | undefined,
          isEv: boolean
        ) => {
          for (const p of places ?? []) {
            if (!p.location || !p.displayName) continue;
            const loc = p.location.toJSON();
            // Restrict to Phnom Penh metropolitan bounds
            if (
              loc.lat < 11.42 ||
              loc.lat > 11.72 ||
              loc.lng < 104.78 ||
              loc.lng > 105.02
            ) {
              continue;
            }
            const placeId = p.id ?? `${loc.lat.toFixed(5)}-${loc.lng.toFixed(5)}`;
            mapped.push({
              id: `gp-${placeId}`,
              googlePlaceId: p.id ?? undefined,
              name: p.displayName,
              tagline: isEv
                ? 'EV charging location discovered via Google Places.'
                : 'Parking location discovered via Google Places.',
              address: p.formattedAddress ?? 'Phnom Penh, Cambodia',
              district: 'Phnom Penh',
              facilityType: isEv ? 'ev_station' : 'public',
              openHours: 'See Google Maps hours',
              pricePerHourKhr: null,
              pricePerHour: 2000,
              pricing: {
                verificationStatus: 'unavailable',
                sourceLabel: 'Google Places (tariff not provided by API)',
                carHourly: { khr: null, unit: 'hour' },
              },
              availability: {
                status: 'unknown',
                source: 'unverified',
                availableSpaces: null,
                note: 'Live availability not provided by Google Places',
              },
              evCharging: isEv
                ? {
                    provider: p.displayName,
                    connectorTypes: ['Connector details unverified'],
                    maxPowerKw: null,
                    speedTier: 'unknown',
                    pricePerKwhKhr: null,
                    priceStatus: 'unavailable',
                    operatingHours: 'See Google Maps hours',
                    portCount: null,
                    liveStatus: 'unknown',
                  }
                : undefined,
              categories: isEv ? ['ev', 'car'] : ['car', 'motorcycle'],
              images: ['/src/assets/images/central_plaza_garage_1795607312182.jpg'],
              description:
                'Location retrieved live from Google Places in Phnom Penh. Pricing and live space counts are shown as unavailable unless confirmed by the operator.',
              facilities: ['Google Places Listed'],
              distanceKm: null,
              rating: typeof p.rating === 'number' ? p.rating : null,
              reviewCount:
                typeof p.userRatingCount === 'number' ? p.userRatingCount : null,
              dataSource: 'google_places',
              priceConfidence: 'unknown',
              locationConfidence: 'high',
              sourceUrls: ['https://maps.google.com/'],
              lastVerifiedDate: new Date().toISOString().slice(0, 10),
              coordinates: { x: 50, y: 50 },
              position: loc,
              floors: buildStandardDemoFloors(isEv),
            });
          }
        };

        addMapped(parkingRes.places, false);
        addMapped(evRes.places, true);

        onPlacesDiscovered(
          mapped,
          mapped.length > 0
            ? `Discovered ${mapped.length} Google Places listings in Phnom Penh.`
            : 'No additional Google Places listings found in this area.'
        );
      } catch (err) {
        if (cancelled) return;
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        onPlacesDiscovered(
          [],
          'Unable to query Google Places right now. Showing verified Phnom Penh dataset.'
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [placesDiscoverySeq, placesLib, map, onPlacesDiscovered]);

  // Routes API driving directions
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
          onRouteComputed(null, 'Routes service is loading. Try again in a moment.');
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
          onRouteComputed(null, 'No driving route found to this location.');
          return;
        }

        if (typeof primaryRoute.createPolylines === 'function') {
          const polylines = primaryRoute.createPolylines({
            polylineOptions: {
              strokeColor: '#141517',
              strokeOpacity: 0.9,
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
            strokeOpacity: 0.9,
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

  useEffect(() => {
    if (
      status === APILoadingStatus.FAILED ||
      status === APILoadingStatus.AUTH_FAILURE
    ) {
      onFallbackToOsm();
    }
  }, [status, onFallbackToOsm]);

  if (
    status === APILoadingStatus.FAILED ||
    status === APILoadingStatus.AUTH_FAILURE
  ) {
    return null;
  }

  return (
    <div className="relative w-full h-full">
      {status === APILoadingStatus.LOADING && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#F2F4EF]/90">
          <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white shadow-sm text-[13px] font-semibold text-[#141517]">
            <Loader2 className="w-4 h-4 animate-spin text-[#5A760E]" />
            <span>Loading Phnom Penh Google Map…</span>
          </div>
        </div>
      )}

      <GoogleMap
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        defaultCenter={PHNOM_PENH_CENTER}
        defaultZoom={13}
        mapTypeId={mapType}
        gestureHandling="greedy"
        streetViewControl={false}
        mapTypeControl={false}
        fullscreenControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        {userPosition && (
          <AdvancedMarker
            position={userPosition}
            zIndex={950}
            title="Your current location"
          >
            <div className="w-9 h-9 rounded-full bg-blue-600/15 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-blue-600 border-[3px] border-white shadow-md" />
            </div>
          </AdvancedMarker>
        )}

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

        {sortedLots.map((lot, idx) => {
          const isSelected = lot.id === selectedLot?.id;
          return (
            <ParkingMarkerItem
              key={lot.id}
              lot={lot}
              isSelected={isSelected}
              isHovered={hoveredLotId === lot.id}
              baseZIndex={idx + 1}
              userPosition={userPosition}
              showInfoWindow={infoWindowLotId === lot.id}
              onHoverChange={(hovered) =>
                setHoveredLotId(hovered ? lot.id : null)
              }
              onSelect={() => {
                onSelectLotFromMarker(lot.id);
                setInfoWindowLotId(lot.id);
              }}
              onCloseInfoWindow={() => setInfoWindowLotId(null)}
              onDirections={() => onRequestDirections(lot)}
              onViewDetails={() => onOpenDetails(lot.id)}
            />
          );
        })}
      </GoogleMap>
    </div>
  );
};

export const MapExplorerView: React.FC<MapExplorerViewProps> = ({
  allLots,
  filteredLots,
  selectedLotId,
  searchQuery,
  selectedDistrict,
  vehicleType,
  priceBracket,
  facilityType,
  availabilityFilter,
  evFilter,
  nearUserOnly,
  userPosition,
  onSearchChange,
  onDistrictChange,
  onVehicleTypeChange,
  onPriceBracketChange,
  onFacilityTypeChange,
  onAvailabilityFilterChange,
  onEvFilterChange,
  onNearUserOnlyChange,
  onResetFilters,
  onUserPositionChange,
  onSelectLot,
  onOpenDetails,
  onMergeGooglePlacesLots,
  externalRouteRequest,
  driveVehicle,
  findingNearest,
  onRequestNearestDrive,
  onChangeDriveVehicle,
}) => {
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [useOsmFallback, setUseOsmFallback] = useState(!MAPS_API_KEY);
  const [locating, setLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [searchedPlace, setSearchedPlace] = useState<SearchedPlaceResult | null>(
    null
  );
  const [placeSearchTrigger, setPlaceSearchTrigger] = useState<{
    query: string;
    seq: number;
  } | null>(null);
  const [placesDiscoverySeq, setPlacesDiscoverySeq] = useState(0);
  const [focusLotTrigger, setFocusLotTrigger] = useState<{
    lot: ParkingLot;
    seq: number;
  } | null>(null);
  const [routeTrigger, setRouteTrigger] = useState<{
    lot: ParkingLot;
    origin: google.maps.LatLngLiteral;
    seq: number;
  } | null>(null);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [recenterSeq, setRecenterSeq] = useState(0);
  // Responsive layout controls across mobile (<768), tablet (768-1023), and desktop (1024+)
  const [mobileViewMode, setMobileViewMode] = useState<'map' | 'list'>('map');
  const [mobileSheetState, setMobileSheetState] = useState<
    'peek' | 'expanded' | 'minimized'
  >('peek');
  const [tabletLayoutMode, setTabletLayoutMode] = useState<
    'split' | 'map' | 'list'
  >('split');
  const [desktopPanelMode, setDesktopPanelMode] = useState<
    'standard' | 'wide' | 'collapsed'
  >('standard');
  const [showMobileLegend, setShowMobileLegend] = useState(false);
  const sheetTouchStartY = useRef<number | null>(null);

  useEffect(() => {
    const handleQuota = () => setUseOsmFallback(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  const listCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const selectedLot =
    filteredLots.find((l) => l.id === selectedLotId) ??
    allLots.find((l) => l.id === selectedLotId) ??
    null;

  const showEvSubFilters =
    vehicleType === 'ev' || facilityType === 'ev_station' || evFilter !== 'all';

  const activeFilterCount =
    (selectedDistrict !== 'All Phnom Penh' ? 1 : 0) +
    (vehicleType !== 'all' ? 1 : 0) +
    (priceBracket !== 'all' ? 1 : 0) +
    (facilityType !== 'all' ? 1 : 0) +
    (availabilityFilter !== 'all' ? 1 : 0) +
    (evFilter !== 'all' ? 1 : 0) +
    (nearUserOnly ? 1 : 0);

  useEffect(() => {
    if (!externalRouteRequest) return;
    setStatusMessage(externalRouteRequest.note ?? null);
    setMobileViewMode('map');
    setMobileSheetState('peek');
    setFocusLotTrigger((prev) => ({
      lot: externalRouteRequest.lot,
      seq: (prev?.seq ?? 0) + 1,
    }));
    setRouteTrigger((prev) => ({
      lot: externalRouteRequest.lot,
      origin: externalRouteRequest.origin ?? userPosition ?? PHNOM_PENH_CENTER,
      seq: (prev?.seq ?? 0) + 1,
    }));
  }, [externalRouteRequest, userPosition]);

  const handleLocateMe = () => {
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
        onUserPositionChange(coords);
        setLocating(false);
        setRecenterSeq((s) => s + 1);
      },
      () => {
        setLocating(false);
        setStatusMessage(
          'Location permission declined. Map remains centered on Phnom Penh.'
        );
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

  const handleSelectFromList = (lot: ParkingLot) => {
    onSelectLot(lot.id);
    setFocusLotTrigger((prev) => ({
      lot,
      seq: (prev?.seq ?? 0) + 1,
    }));
  };

  const handleSelectFromMarker = useCallback(
    (lotId: string) => {
      onSelectLot(lotId);
      const cardEl = listCardRefs.current[lotId];
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    },
    [onSelectLot]
  );

  const handleRequestDirections = useCallback(
    (lot: ParkingLot) => {
      setStatusMessage(null);
      setRouteTrigger((prev) => ({
        lot,
        origin: userPosition ?? PHNOM_PENH_CENTER,
        seq: (prev?.seq ?? 0) + 1,
      }));
    },
    [userPosition]
  );

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

  const handlePlacesDiscovered = useCallback(
    (discovered: ParkingLot[], msg: string) => {
      if (discovered.length > 0) {
        onMergeGooglePlacesLots(discovered);
      }
      setStatusMessage(msg);
    },
    [onMergeGooglePlacesLots]
  );


  const handleSheetTouchStart = (e: React.TouchEvent) => {
    sheetTouchStartY.current = e.touches[0]?.clientY ?? null;
  };

  const handleSheetTouchEnd = (e: React.TouchEvent) => {
    if (sheetTouchStartY.current === null) return;
    const endY = e.changedTouches[0]?.clientY ?? sheetTouchStartY.current;
    const deltaY = endY - sheetTouchStartY.current;
    sheetTouchStartY.current = null;
    if (deltaY < -36) {
      setMobileSheetState((prev) => (prev === 'minimized' ? 'peek' : 'expanded'));
    } else if (deltaY > 36) {
      setMobileSheetState((prev) => (prev === 'expanded' ? 'peek' : 'minimized'));
    }
  };

  const renderFilterDrawerContent = () => (
    <div className="space-y-2.5">
      {/* Quick Neighborhood Selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {PHNOM_PENH_DISTRICTS.map((district) => {
          const active = selectedDistrict === district;
          return (
            <button
              key={district}
              type="button"
              onClick={() => onDistrictChange(district)}
              className={`min-h-[38px] lg:min-h-[34px] px-3 py-1.5 rounded-full text-[12px] whitespace-nowrap shrink-0 transition-colors ${
                active
                  ? 'bg-[#141517] text-white font-semibold'
                  : 'bg-[#F4F5F6] text-[#525760] hover:text-[#141517] font-medium'
              }`}
            >
              {district}
            </button>
          );
        })}
      </div>

      {/* Quick Vehicle Type Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {VEHICLE_FILTER_OPTIONS.map((opt) => {
          const active = vehicleType === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onVehicleTypeChange(opt.id)}
              className={`min-h-[38px] lg:min-h-[34px] px-3 py-1.5 rounded-full text-[12px] whitespace-nowrap shrink-0 transition-all ${
                active
                  ? 'bg-[#C5EC45] text-[#141517] font-semibold'
                  : 'bg-[#F4F5F6] text-[#525760] hover:text-[#141517] font-medium'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Dedicated EV Sub-Filter Bar */}
      {showEvSubFilters && (
        <div className="bg-cyan-50/70 border border-cyan-200 rounded-2xl p-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-cyan-900 inline-flex items-center gap-1 mr-1">
            <BatteryCharging className="w-3.5 h-3.5" />
            EV Filter:
          </span>
          {EV_FILTER_OPTIONS.map((opt) => {
            const active = evFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onEvFilterChange(opt.id)}
                className={`min-h-[36px] px-2.5 py-1 rounded-full text-[11.5px] font-medium transition-colors ${
                  active
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'bg-white text-cyan-900 hover:bg-cyan-100'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Collapsible Price, Type, Availability & Near Me Filter Grid */}
      {showAdvancedFilters && (
        <div className="bg-[#F6F7F8] rounded-2xl p-3 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label
                htmlFor="filter-price-bracket"
                className="block text-[11px] font-semibold text-[#525760] mb-1"
              >
                Parking Price
              </label>
              <select
                id="filter-price-bracket"
                value={priceBracket}
                onChange={(e) =>
                  onPriceBracketChange(e.target.value as PriceBracketFilter)
                }
                className="w-full h-10 px-2.5 rounded-xl bg-white text-[12px] text-[#141517] border border-black/10 focus:outline-none focus:ring-2 focus:ring-[#C5EC45]"
              >
                {PRICE_FILTER_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-facility-type"
                className="block text-[11px] font-semibold text-[#525760] mb-1"
              >
                Parking Type
              </label>
              <select
                id="filter-facility-type"
                value={facilityType}
                onChange={(e) =>
                  onFacilityTypeChange(e.target.value as FacilityType | 'all')
                }
                className="w-full h-10 px-2.5 rounded-xl bg-white text-[12px] text-[#141517] border border-black/10 focus:outline-none focus:ring-2 focus:ring-[#C5EC45]"
              >
                {FACILITY_TYPE_FILTER_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-availability"
                className="block text-[11px] font-semibold text-[#525760] mb-1"
              >
                Availability
              </label>
              <select
                id="filter-availability"
                value={availabilityFilter}
                onChange={(e) =>
                  onAvailabilityFilterChange(
                    e.target.value as AvailabilityStatus | 'all'
                  )
                }
                className="w-full h-10 px-2.5 rounded-xl bg-white text-[12px] text-[#141517] border border-black/10 focus:outline-none focus:ring-2 focus:ring-[#C5EC45]"
              >
                {AVAILABILITY_FILTER_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
            <button
              type="button"
              onClick={() => {
                if (!userPosition) {
                  handleLocateMe();
                  onNearUserOnlyChange(true);
                } else {
                  onNearUserOnlyChange(!nearUserOnly);
                }
              }}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-[11.5px] font-semibold inline-flex items-center gap-1.5 transition-colors ${
                nearUserOnly && userPosition
                  ? 'bg-[#141517] text-white'
                  : 'bg-white text-[#525760] border border-black/10 hover:text-[#141517]'
              }`}
            >
              <Navigation className="w-3 h-3" />
              Near My Location (≤ 3.5 km)
            </button>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={onResetFilters}
                className="min-h-[40px] px-2.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#525760] hover:text-[#141517]"
              >
                <RotateCcw className="w-3 h-3" />
                Reset All
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderResultCards = (compactMode = false) =>
    filteredLots.length === 0 ? (
      <div className="bg-white rounded-[22px] p-6 sm:p-7 text-center space-y-3 border border-black/[0.04]">
        <Search className="w-6 h-6 text-[#767B84] mx-auto" />
        <div>
          <p className="text-[14.5px] font-bold text-[#141517]">
            No matching Phnom Penh facilities
          </p>
          <p className="text-[12.5px] text-[#767B84] mt-1">
            Try clearing one of the neighborhood, price, or vehicle filters.
          </p>
        </div>
        <button
          type="button"
          onClick={onResetFilters}
          className="min-h-[44px] px-5 py-2 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[12.5px] font-semibold"
        >
          Reset All Filters
        </button>
      </div>
    ) : (
      filteredLots.map((lot) => {
        const isSelected = lot.id === selectedLot?.id;
        const priceDisplay = getCompactPriceDisplay(lot);
        const distanceKm = userPosition
          ? calculateDistanceKm(userPosition, lot.position)
          : null;
        const variant = getMarkerColorVariant(lot);

        return (
          <div
            key={lot.id}
            ref={(el) => {
              listCardRefs.current[lot.id] = el;
            }}
            onClick={() => {
              handleSelectFromList(lot);
              if (compactMode) {
                setMobileViewMode('map');
                setMobileSheetState('peek');
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectFromList(lot);
                if (compactMode) {
                  setMobileViewMode('map');
                  setMobileSheetState('peek');
                }
              }
            }}
            className={`bg-white rounded-[20px] p-3.5 transition-all cursor-pointer border ${
              isSelected
                ? 'border-[#C5EC45] ring-2 ring-[#C5EC45] shadow-[0_8px_24px_rgba(20,21,23,0.08)]'
                : 'border-black/[0.05] hover:border-black/15 shadow-[0_2px_10px_rgba(20,21,23,0.03)]'
            }`}
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      MARKER_LEGEND.find((m) => m.variant === variant)
                        ?.dotClass ?? 'bg-blue-600'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="text-[11px] font-semibold text-[#525760]">
                    {FACILITY_TYPE_LABELS[lot.facilityType]}
                  </span>
                  <span className="text-[11px] text-[#9CA3AF]">·</span>
                  <span className="text-[11px] font-medium text-[#767B84]">
                    {lot.district}
                  </span>
                </div>
                <h3 className="text-[14.5px] font-bold text-[#141517] mt-1 leading-snug">
                  {lot.name}
                </h3>
                <p className="text-[12px] text-[#767B84] truncate mt-0.5">
                  {lot.address}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p
                  className={`text-[13.5px] font-extrabold tabular-nums ${
                    priceDisplay.status === 'unavailable'
                      ? 'text-[#767B84] font-semibold text-[12px]'
                      : priceDisplay.primaryText === 'Free parking'
                        ? 'text-emerald-700'
                        : 'text-[#141517]'
                  }`}
                >
                  {priceDisplay.primaryText}
                </p>
                {priceDisplay.secondaryUsd && (
                  <p className="text-[11px] text-[#767B84] tabular-nums">
                    {priceDisplay.secondaryUsd}
                  </p>
                )}
                <span
                  className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    priceDisplay.status === 'confirmed'
                      ? 'bg-emerald-50 text-emerald-700'
                      : priceDisplay.status === 'estimated'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {priceDisplay.status === 'confirmed'
                    ? 'Confirmed'
                    : priceDisplay.status === 'estimated'
                      ? 'Estimated'
                      : 'Unverified'}
                </span>
              </div>
            </div>

            <div className="mt-2.5 pt-2.5 border-t border-[#F4F5F6] flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-[11.5px] text-[#525760] flex-wrap">
                {lot.evCharging ? (
                  <span className="inline-flex items-center gap-1 text-cyan-800 font-semibold bg-cyan-50 px-2 py-0.5 rounded-full">
                    <Zap className="w-3 h-3" />
                    {lot.evCharging.maxPowerKw
                      ? `${lot.evCharging.maxPowerKw} kW`
                      : lot.evCharging.speedTier === 'fast'
                        ? 'Fast DC'
                        : 'AC'}{' '}
                    · {lot.evCharging.connectorTypes.join('/')}
                  </span>
                ) : (
                  <>
                    {lot.pricing.motorcycle?.khr !== undefined &&
                      lot.pricing.motorcycle.khr !== null && (
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Bike className="w-3.5 h-3.5" />
                          Moto: {lot.pricing.motorcycle.khr.toLocaleString()} KHR
                        </span>
                      )}
                    {lot.categories.includes('car') && (
                      <span className="inline-flex items-center gap-1">
                        <Car className="w-3.5 h-3.5" />
                        Car
                      </span>
                    )}
                  </>
                )}
                {distanceKm !== null && (
                  <span className="font-semibold text-[#141517] tabular-nums">
                    · {distanceKm.toFixed(1)} km
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectLot(lot.id);
                  onOpenDetails(lot.id);
                }}
                className="min-h-[38px] lg:min-h-[32px] px-3.5 py-1 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[12px] font-bold transition-colors"
              >
                View Details
              </button>
            </div>
          </div>
        );
      })
    );

  const selectedPriceDisplay = selectedLot
    ? getCompactPriceDisplay(selectedLot)
    : null;
  const selectedDistanceKm =
    selectedLot && userPosition
      ? calculateDistanceKm(userPosition, selectedLot.position)
      : null;

  const leftColClass =
    desktopPanelMode === 'collapsed'
      ? 'hidden'
      : desktopPanelMode === 'wide'
        ? 'lg:col-span-6'
        : 'lg:col-span-5';

  const rightColClass =
    desktopPanelMode === 'collapsed'
      ? 'lg:col-span-12'
      : desktopPanelMode === 'wide'
        ? 'lg:col-span-6'
        : 'lg:col-span-7';

  const showListSection =
    tabletLayoutMode === 'list' ||
    tabletLayoutMode === 'split' ||
    mobileViewMode === 'list';

  const showMapSection =
    tabletLayoutMode === 'map' ||
    tabletLayoutMode === 'split' ||
    mobileViewMode === 'map';

  return (
    <section
      aria-label="Phnom Penh Smart Parking & EV Map Discovery"
      className="max-w-[1440px] 2xl:max-w-[1600px] mx-auto w-full px-2.5 sm:px-4 lg:px-6 xl:px-8 pb-24 md:pb-6"
    >
      {/* Mobile (<768px) & Tablet (768-1023px) Top Control Bar: Search, Filters & View Mode Switcher */}
      <div className="lg:hidden bg-white rounded-[22px] md:rounded-[26px] shadow-[0_8px_24px_rgba(20,21,23,0.05)] border border-black/[0.04] p-3 sm:p-3.5 mb-2.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-[16px] sm:text-[17px] font-extrabold tracking-[-0.02em] text-[#141517] truncate">
              Phnom Penh Parking & EV
            </h1>
            <p className="text-[11.5px] text-[#767B84] tabular-nums">
              {filteredLots.length} locations
              {activeFilterCount > 0 ? ` · ${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'}` : ''}
            </p>
          </div>

          {/* Mobile Map/List Toggle */}
          <div
            role="group"
            aria-label="Mobile discovery view mode"
            className="md:hidden inline-flex items-center bg-[#F4F5F6] rounded-full p-1 gap-1 shrink-0"
          >
            <button
              type="button"
              onClick={() => setMobileViewMode('map')}
              aria-pressed={mobileViewMode === 'map'}
              className={`min-h-[38px] px-3 rounded-full text-[12px] font-semibold inline-flex items-center gap-1 transition-all ${
                mobileViewMode === 'map'
                  ? 'bg-[#C5EC45] text-[#141517] shadow-2xs'
                  : 'text-[#525760]'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileViewMode('list')}
              aria-pressed={mobileViewMode === 'list'}
              className={`min-h-[38px] px-3 rounded-full text-[12px] font-semibold inline-flex items-center gap-1 transition-all ${
                mobileViewMode === 'list'
                  ? 'bg-[#C5EC45] text-[#141517] shadow-2xs'
                  : 'text-[#525760]'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>List ({filteredLots.length})</span>
            </button>
          </div>

          {/* Tablet Split / Map / List Toggle */}
          <div
            role="group"
            aria-label="Tablet map layout mode"
            className="hidden md:inline-flex items-center bg-[#F4F5F6] rounded-full p-1 gap-1 shrink-0"
          >
            {(
              [
                { id: 'split', label: 'Split View' },
                { id: 'map', label: 'Full Map' },
                { id: 'list', label: `List (${filteredLots.length})` },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setTabletLayoutMode(mode.id)}
                aria-pressed={tabletLayoutMode === mode.id}
                className={`min-h-[38px] px-3.5 rounded-full text-[12.5px] font-semibold transition-all ${
                  tabletLayoutMode === mode.id
                    ? 'bg-[#C5EC45] text-[#141517] shadow-2xs'
                    : 'text-[#525760] hover:text-[#141517]'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile/Tablet Search + Filter Toggle */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search
              className="w-4 h-4 text-[#767B84] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="mobile-map-search-input" className="sr-only">
              Search neighborhood, landmark, street, or parking
            </label>
            <input
              id="mobile-map-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (!e.target.value.trim()) {
                  setSearchedPlace(null);
                  setStatusMessage(null);
                }
              }}
              placeholder="Search BKK1, Toul Kork, AEON..."
              className="w-full h-11 pl-9 pr-9 rounded-full bg-[#F4F5F6] text-[13.5px] text-[#141517] placeholder:text-[#8E939B] focus:outline-none focus:ring-2 focus:ring-[#C5EC45] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  setSearchedPlace(null);
                  setStatusMessage(null);
                }}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-[#767B84] hover:text-[#141517]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="h-11 px-3.5 rounded-full bg-[#141517] hover:bg-[#2A2D32] text-white text-[12.5px] font-semibold whitespace-nowrap shrink-0 transition-colors"
          >
            Locate
          </button>

          <button
            type="button"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            aria-expanded={showAdvancedFilters}
            className={`h-11 px-3 rounded-full text-[12.5px] font-semibold inline-flex items-center gap-1.5 shrink-0 transition-colors ${
              showAdvancedFilters || activeFilterCount > 0
                ? 'bg-[#C5EC45] text-[#141517]'
                : 'bg-[#F4F5F6] text-[#525760]'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden min-[380px]:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="tabular-nums">({activeFilterCount})</span>
            )}
          </button>
        </form>

        {/* Scrollable Quick Pills + Expandable Advanced Filter Grid on Mobile/Tablet */}
        <div className="max-h-[48dvh] overflow-y-auto clean-scroll">
          {renderFilterDrawerContent()}
        </div>

        {statusMessage && (
          <p role="status" className="text-[12px] text-[#525760] px-1">
            {statusMessage}
          </p>
        )}
      </div>

      {/* Responsive Workspace Grid: Desktop Split-Screen (lg+) | Tablet Adjustable Split | Mobile Map+Sheet or List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 items-stretch lg:h-[calc(100dvh-96px)] lg:min-h-[540px]">
        {/* DESKTOP LEFT PANEL (lg+) OR MOBILE/TABLET LIST */}
        <div
          className={`${leftColClass} ${
            desktopPanelMode !== 'collapsed' ? 'lg:flex' : 'lg:hidden'
          } ${
            showListSection ? 'flex' : 'hidden'
          } bg-white rounded-[24px] lg:rounded-[28px] shadow-[0_14px_40px_rgba(20,21,23,0.06)] border border-black/[0.04] flex-col ${
            tabletLayoutMode === 'split'
              ? 'md:max-h-[42dvh] lg:max-h-none'
              : ''
          } min-h-[360px] lg:min-h-0 overflow-hidden order-2 lg:order-1`}
        >
          {/* Desktop Search & Filter Header */}
          <div className="hidden lg:block p-4 border-b border-[#F0F1F3] space-y-3 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-[18px] font-extrabold tracking-[-0.02em] text-[#141517] truncate">
                  Phnom Penh Parking & EV
                </h1>
                <p className="text-[12px] text-[#767B84] tabular-nums">
                  {filteredLots.length} locations in Phnom Penh
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters((prev) => !prev)}
                  className={`h-9 px-3 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors ${
                    showAdvancedFilters || activeFilterCount > 0
                      ? 'bg-[#C5EC45] text-[#141517]'
                      : 'bg-[#F4F5F6] text-[#525760] hover:text-[#141517]'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDesktopPanelMode((prev) =>
                      prev === 'wide' ? 'standard' : 'wide'
                    )
                  }
                  aria-label={
                    desktopPanelMode === 'wide'
                      ? 'Use standard list width'
                      : 'Widen results panel'
                  }
                  title={
                    desktopPanelMode === 'wide'
                      ? 'Standard panel width'
                      : 'Widen results panel'
                  }
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    desktopPanelMode === 'wide'
                      ? 'bg-[#141517] text-white'
                      : 'bg-[#F4F5F6] text-[#525760] hover:text-[#141517]'
                  }`}
                >
                  <Columns2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopPanelMode('collapsed')}
                  aria-label="Collapse results panel for full map"
                  title="Collapse results panel"
                  className="w-9 h-9 rounded-full bg-[#F4F5F6] text-[#525760] hover:text-[#141517] flex items-center justify-center transition-colors"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search
                  className="w-4 h-4 text-[#767B84] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <label htmlFor="map-search-input" className="sr-only">
                  Search neighborhood, landmark, street, or parking
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
                  placeholder="Search BKK1, Toul Kork, AEON, Street 51..."
                  className="w-full h-10 pl-9 pr-8 rounded-full bg-[#F4F5F6] text-[13.5px] text-[#141517] placeholder:text-[#8E939B] focus:outline-none focus:ring-2 focus:ring-[#C5EC45] focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      onSearchChange('');
                      setSearchedPlace(null);
                      setStatusMessage(null);
                    }}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-[#767B84] hover:text-[#141517]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="h-10 px-4 rounded-full bg-[#141517] hover:bg-[#2A2D32] text-white text-[12.5px] font-semibold whitespace-nowrap shrink-0 transition-colors"
              >
                Locate
              </button>
            </form>

            {renderFilterDrawerContent()}

            {statusMessage && (
              <p role="status" className="text-[12px] text-[#525760] px-1">
                {statusMessage}
              </p>
            )}
          </div>

          {/* Synchronized Parking & EV Results List */}
          <div className="flex-1 min-h-0 overflow-y-auto clean-scroll p-3 sm:p-3.5 space-y-2.5 bg-[#FAFAFA]">
            {renderResultCards(mobileViewMode === 'list')}
          </div>
        </div>

        {/* RIGHT PANEL: Interactive Map Centered on Phnom Penh (Google Maps or Free OpenStreetMap) */}
        <div
          className={`${rightColClass} lg:flex ${
            showMapSection ? 'flex' : 'hidden'
          } bg-white rounded-[24px] lg:rounded-[28px] shadow-[0_14px_40px_rgba(20,21,23,0.06)] border border-black/[0.04] overflow-hidden flex-col relative isolate z-0 ${
            mobileViewMode === 'map'
              ? 'h-[max(270px,calc(100dvh-328px))] min-h-[270px] sm:h-[calc(100dvh-300px)] md:h-[46dvh] md:min-h-[360px]'
              : 'md:h-[46dvh] md:min-h-[360px]'
          } ${
            tabletLayoutMode === 'map'
              ? 'md:h-[calc(100dvh-220px)] md:min-h-[480px]'
              : ''
          } lg:h-full lg:min-h-0 order-1 lg:order-2`}
        >
          <div className="relative flex-1 w-full bg-[#EEF2EB]">
            {MAPS_API_KEY && !useOsmFallback ? (
              <APIProvider
                apiKey={MAPS_API_KEY}
                libraries={['marker', 'places', 'routes']}
                language="en"
                region="KH"
              >
                <GoogleMapCanvas
                  lots={filteredLots}
                  selectedLot={selectedLot}
                  focusLotTrigger={focusLotTrigger}
                  mapType={mapType}
                  userPosition={userPosition}
                  searchedPlace={searchedPlace}
                  routeTrigger={routeTrigger}
                  placeSearchTrigger={placeSearchTrigger}
                  placesDiscoverySeq={placesDiscoverySeq}
                  recenterSeq={recenterSeq}
                  onSelectLotFromMarker={handleSelectFromMarker}
                  onOpenDetails={onOpenDetails}
                  onRequestDirections={handleRequestDirections}
                  onSearchedPlace={handleSearchedPlaceResult}
                  onRouteComputed={handleRouteComputed}
                  onPlacesDiscovered={handlePlacesDiscovered}
                  onFallbackToOsm={() => setUseOsmFallback(true)}
                />
              </APIProvider>
            ) : (
              <LeafletPhnomPenhMap
                lots={filteredLots}
                selectedLot={selectedLot}
                focusLotTrigger={focusLotTrigger}
                mapType={mapType}
                userPosition={userPosition}
                searchedPlace={searchedPlace}
                routeTrigger={routeTrigger}
                placeSearchTrigger={placeSearchTrigger}
                osmDiscoverySeq={placesDiscoverySeq}
                recenterSeq={recenterSeq}
                onSelectLotFromMarker={handleSelectFromMarker}
                onOpenDetails={onOpenDetails}
                onRequestDirections={handleRequestDirections}
                onSearchedPlace={handleSearchedPlaceResult}
                onRouteComputed={handleRouteComputed}
                onPlacesDiscovered={handlePlacesDiscovered}
              />
            )}

            {/* Top Map Utility Controls (Single horizontally-scrollable row on narrow screens) */}
            <div className="absolute top-2.5 sm:top-3.5 left-2.5 sm:left-3.5 right-2.5 sm:right-3.5 z-[400] flex items-center gap-2 overflow-x-auto no-scrollbar pointer-events-auto">
              {desktopPanelMode === 'collapsed' && (
                <button
                  type="button"
                  onClick={() => setDesktopPanelMode('standard')}
                  className="hidden lg:inline-flex h-9 px-3 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[12px] font-bold shadow-md items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                >
                  <PanelLeftOpen className="w-3.5 h-3.5" />
                  <span>Show List ({filteredLots.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={onRequestNearestDrive}
                disabled={findingNearest}
                data-testid="map-nearest-drive-btn"
                className="min-h-[40px] lg:min-h-[36px] px-3 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[12px] font-bold shadow-md inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors disabled:opacity-75"
              >
                {findingNearest ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : driveVehicle === 'car' ? (
                  <Car className="w-3.5 h-3.5" />
                ) : driveVehicle === 'motorcycle' ? (
                  <Bike className="w-3.5 h-3.5" />
                ) : (
                  <Navigation className="w-3.5 h-3.5" />
                )}
                <span>
                  {driveVehicle === 'car'
                    ? 'Drive Nearest'
                    : driveVehicle === 'motorcycle'
                      ? 'Ride Nearest'
                      : 'Nearest & Drive'}
                </span>
              </button>

              {driveVehicle !== null && (
                <button
                  type="button"
                  onClick={() =>
                    onChangeDriveVehicle(driveVehicle === 'car' ? 'motorcycle' : 'car')
                  }
                  aria-label={`Switch vehicle mode from ${driveVehicle === 'car' ? 'Car' : 'Moto'}`}
                  title={`Saved: ${driveVehicle === 'car' ? 'Car' : 'Moto'} (tap to switch)`}
                  className="min-h-[40px] lg:min-h-[36px] px-2.5 rounded-full bg-white/95 hover:bg-white text-[#141517] text-[11.5px] font-semibold shadow-md inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                >
                  {driveVehicle === 'car' ? (
                    <>
                      <Car className="w-3.5 h-3.5" />
                      <span>Car</span>
                    </>
                  ) : (
                    <>
                      <Bike className="w-3.5 h-3.5" />
                      <span>Moto</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setMapType((prev) => (prev === 'roadmap' ? 'hybrid' : 'roadmap'))
                }
                className="min-h-[40px] lg:min-h-[36px] px-3 rounded-full bg-white/95 hover:bg-white text-[#141517] text-[12px] font-semibold shadow-md inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{mapType === 'roadmap' ? 'Satellite' : 'Map'}</span>
              </button>

              <button
                type="button"
                onClick={handleLocateMe}
                disabled={locating}
                className="min-h-[40px] lg:min-h-[36px] px-3 rounded-full bg-white/95 hover:bg-white text-[#141517] text-[12px] font-semibold shadow-md inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors disabled:opacity-70"
              >
                {locating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Crosshair className="w-3.5 h-3.5" />
                )}
                <span>My Location</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSearchedPlace(null);
                  setStatusMessage(null);
                  setRecenterSeq((s) => s + 1);
                }}
                className="min-h-[40px] lg:min-h-[36px] px-3 rounded-full bg-white/95 hover:bg-white text-[#141517] text-[12px] font-semibold shadow-md inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Phnom Penh</span>
              </button>

              <button
                type="button"
                onClick={() => setPlacesDiscoverySeq((s) => s + 1)}
                className="min-h-[40px] lg:min-h-[36px] px-3 rounded-full bg-[#141517]/95 hover:bg-[#141517] text-white text-[12px] font-semibold shadow-md inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-[#C5EC45]" />
                <span>
                  {MAPS_API_KEY && !useOsmFallback
                    ? 'Scan Google Places'
                    : 'Scan OpenStreetMap'}
                </span>
              </button>

              {MAPS_API_KEY && (
                <button
                  type="button"
                  onClick={() => setUseOsmFallback((prev) => !prev)}
                  className="min-h-[40px] lg:min-h-[36px] px-3 rounded-full bg-white/95 hover:bg-white text-[#525760] text-[11.5px] font-semibold shadow-md whitespace-nowrap shrink-0"
                >
                  {useOsmFallback ? 'Use Google Maps' : 'Use OpenStreetMap'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowMobileLegend((prev) => !prev)}
                className="md:hidden min-h-[40px] px-3 rounded-full bg-white/95 text-[#525760] text-[11.5px] font-semibold shadow-md whitespace-nowrap shrink-0"
              >
                Legend
              </button>
            </div>

            {/* Mobile Toggleable Legend Popover */}
            {showMobileLegend && (
              <div className="md:hidden absolute top-14 right-2.5 z-[420] bg-white/95 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-black/[0.06] space-y-1.5">
                {MARKER_LEGEND.map((item) => (
                  <div
                    key={item.variant}
                    className="flex items-center gap-2 text-[11.5px] font-semibold text-[#141517]"
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${item.dotClass}`} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Route Summary Banner (when active) */}
            {routeSummary && (
              <div className="absolute top-14 sm:top-16 left-2.5 sm:left-3.5 z-[400] bg-[#141517] text-white px-3.5 py-2 rounded-full shadow-lg text-[12px] font-semibold flex items-center gap-2 max-w-[calc(100%-20px)]">
                {driveVehicle === 'motorcycle' ? (
                  <Bike className="w-3.5 h-3.5 text-[#C5EC45] shrink-0" />
                ) : driveVehicle === 'car' ? (
                  <Car className="w-3.5 h-3.5 text-[#C5EC45] shrink-0" />
                ) : (
                  <RouteIcon className="w-3.5 h-3.5 text-[#C5EC45] shrink-0" />
                )}
                <span className="truncate">
                  {driveVehicle === 'motorcycle' ? 'Ride' : 'Drive'}: {routeSummary.durationText} · {routeSummary.distanceText}
                </span>
                {routeTrigger && (
                  <a
                    href={buildGoogleMapsDirectionsUrl(
                      routeTrigger.origin,
                      routeTrigger.lot.position,
                      driveVehicle
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 px-2 py-0.5 rounded-full bg-[#C5EC45] text-[#141517] text-[11px] font-bold inline-flex items-center gap-1 shrink-0 hover:bg-[#B6DE35]"
                  >
                    <span>Go</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {/* Tablet & Desktop Bottom Marker Legend */}
            <div className="hidden md:flex absolute bottom-3.5 left-3.5 right-3.5 z-[400] items-center justify-between gap-2 pointer-events-none">
              <div className="bg-white/95 backdrop-blur-sm rounded-full px-3.5 py-2 shadow-md border border-black/[0.05] flex items-center gap-3 overflow-x-auto no-scrollbar pointer-events-auto">
                {MARKER_LEGEND.map((item) => (
                  <div
                    key={item.variant}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-[#141517] whitespace-nowrap shrink-0"
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${item.dotClass}`} />
                    <span>{item.label}</span>
                  </div>
                ))}
                {(!MAPS_API_KEY || useOsmFallback) && (
                  <span className="pl-2 border-l border-black/10 text-[10.5px] font-medium text-[#525760] whitespace-nowrap shrink-0">
                    OpenStreetMap (Free)
                  </span>
                )}
              </div>
            </div>

            {/* Mobile Draggable / Expandable Bottom Sheet Inside Map Frame */}
            {selectedLot && (
              <div
                className={`md:hidden absolute bottom-2 left-2 right-2 z-[410] bg-white rounded-[22px] shadow-[0_12px_36px_rgba(20,21,23,0.18)] border border-black/[0.06] flex flex-col transition-all duration-200 ${
                  mobileSheetState === 'expanded'
                    ? 'max-h-[68%]'
                    : mobileSheetState === 'minimized'
                      ? ''
                      : ''
                }`}
              >
                {/* Drag Handle + Header Toggle */}
                <div
                  onTouchStart={handleSheetTouchStart}
                  onTouchEnd={handleSheetTouchEnd}
                  className="px-3.5 pt-2 pb-1.5 flex items-center justify-between gap-2 border-b border-black/[0.04]"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setMobileSheetState((prev) =>
                        prev === 'minimized'
                          ? 'peek'
                          : prev === 'peek'
                            ? 'expanded'
                            : 'peek'
                      )
                    }
                    aria-label={
                      mobileSheetState === 'expanded'
                        ? 'Collapse bottom sheet'
                        : 'Expand nearby parking sheet'
                    }
                    className="flex-1 min-h-[32px] flex items-center gap-2 text-left"
                  >
                    <span
                      className="w-8 h-1 rounded-full bg-[#D1D5DB] shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-[11px] font-semibold text-[#525760] truncate">
                      {mobileSheetState === 'minimized'
                        ? `${selectedLot.name} · ${selectedPriceDisplay?.primaryText ?? ''}`
                        : `${filteredLots.length} Phnom Penh lots nearby`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setMobileSheetState((prev) =>
                        prev === 'minimized' ? 'peek' : 'minimized'
                      )
                    }
                    aria-label={
                      mobileSheetState === 'minimized'
                        ? 'Show selected location card'
                        : 'Minimize bottom sheet'
                    }
                    className="w-8 h-8 rounded-full bg-[#F4F5F6] text-[#141517] flex items-center justify-center shrink-0"
                  >
                    {mobileSheetState === 'minimized' ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {mobileSheetState !== 'minimized' && (
                  <div className="p-3 space-y-2.5 overflow-y-auto clean-scroll">
                    {/* Active Selected Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-[#525760] truncate">
                          {selectedLot.district} ·{' '}
                          {FACILITY_TYPE_LABELS[selectedLot.facilityType]}
                          {selectedDistanceKm !== null
                            ? ` · ${selectedDistanceKm.toFixed(1)} km`
                            : ''}
                        </p>
                        <h2 className="text-[14.5px] font-bold text-[#141517] truncate">
                          {selectedLot.name}
                        </h2>
                      </div>
                      {selectedPriceDisplay && (
                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-extrabold text-[#141517] tabular-nums">
                            {selectedPriceDisplay.primaryText}
                          </p>
                          {selectedPriceDisplay.secondaryUsd && (
                            <p className="text-[10.5px] text-[#767B84] tabular-nums">
                              {selectedPriceDisplay.secondaryUsd}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleRequestDirections(selectedLot)}
                        className="min-h-[44px] rounded-full bg-[#141517] text-white text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5"
                      >
                        <Navigation className="w-3.5 h-3.5 text-[#C5EC45]" />
                        <span>Route</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenDetails(selectedLot.id)}
                        className="min-h-[44px] rounded-full bg-[#C5EC45] text-[#141517] text-[12.5px] font-bold inline-flex items-center justify-center"
                      >
                        View Details
                      </button>
                    </div>

                    {mobileSheetState === 'expanded' && (
                      <div className="pt-2 border-t border-[#F0F1F3] space-y-2">
                        {renderResultCards(true)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
